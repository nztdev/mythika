/* ════════════════════════════════════════════════════════════════
   chess/ai.js — the computer opponent (Stockfish, spoken to over UCI)
   ════════════════════════════════════════════════════════════════
   Stockfish runs in a Web Worker and communicates by plain text lines
   (the "UCI" protocol): we send `position fen …` + `go movetime …` and
   it eventually answers `bestmove e7e5`.

   This file knows nothing about 3D, the DOM or the Worker class. It is
   given a "worker-like" object — anything with postMessage(string) and an
   onmessage callback — so the same code runs in the browser (a real
   Worker) and in the tests (a Node child process running the very same
   vendored engine file).

   It is built so the game can NEVER hang on the AI:
     • every wait has a timeout
     • a search can be cancelled, and a late answer to a cancelled search
       is recognised and discarded (not mistaken for the next search's)
     • if the engine fails to start, `ready` resolves false and the
       caller falls back to Pass & Play
   ════════════════════════════════════════════════════════════════ */

// Difficulty = Stockfish's own "Skill Level" (0 weakest … 20 strongest)
// plus how long it may think. Approximate human equivalents are rough.
export const DIFFICULTY = {
  apprentice: { label: 'Apprentice', skill: 2,  moveTimeMs: 250  },
  adept:      { label: 'Adept',      skill: 9,  moveTimeMs: 500  },
  master:     { label: 'Master',     skill: 16, moveTimeMs: 1000 },
  demo:       { label: 'Demo',       skill: 6,  moveTimeMs: 300  },  // intro showcase
};

export const WORKER_URL = 'lib/stockfish/stockfish-19-lite-single.js';

export function createEngine(worker, { initTimeoutMs = 12000, idleTimeoutMs = 3000 } = {}){
  const waiters = [];
  let active = null;      // the one search currently running: { resolve, timer }
  let drain = 0;          // `bestmove` lines still owed by cancelled searches — to be ignored
  let failed = false;
  let requestSeq = 0;     // bumped by every request/cancel so superseded waits can bail out
  const idleWaiters = []; // callers waiting for cancelled searches to finish answering

  const send = (cmd) => { try { worker.postMessage(cmd); } catch { failed = true; } };

  function waitFor(test, ms){
    return new Promise((resolve, reject) => {
      const w = { test, resolve, reject, timer: null };
      w.timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(w), 1);
        reject(new Error('Stockfish did not answer in time'));
      }, ms);
      waiters.push(w);
    });
  }

  function parseBestMove(line){
    const mv = line.split(/\s+/)[1];
    return (!mv || mv === '(none)' || mv === '0000') ? null : mv;
  }

  function onLine(raw){
    const line = typeof raw === 'string' ? raw.trim() : '';
    if (!line) return;
    if (line.startsWith('bestmove')){
      if (drain > 0){                             // answer to a search we already cancelled
        drain--;
        if (drain === 0) for (const w of idleWaiters.splice(0)){ clearTimeout(w.timer); w.resolve(true); }
        return;
      }
      if (active){
        const a = active; active = null;
        clearTimeout(a.timer);
        a.resolve(parseBestMove(line));
      }
      return;
    }
    for (const w of [...waiters]){
      if (w.test(line)){
        clearTimeout(w.timer);
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(line);
      }
    }
  }

  function onFailure(){
    failed = true;
    for (const w of waiters.splice(0)){ clearTimeout(w.timer); w.reject(new Error('Stockfish worker failed')); }
    if (active){ const a = active; active = null; clearTimeout(a.timer); a.resolve(null); }
    for (const w of idleWaiters.splice(0)){ clearTimeout(w.timer); w.resolve(false); }
  }

  worker.onmessage = (e) => onLine(e && e.data !== undefined ? e.data : e);
  worker.onerror = onFailure;

  // Handshake. `ready` ALWAYS resolves (true/false) and never rejects.
  const ready = (async () => {
    try {
      send('uci');
      await waitFor(l => l === 'uciok', initTimeoutMs);
      send('setoption name Hash value 16');   // modest memory: this runs on phones
      send('isready');
      await waitFor(l => l === 'readyok', 8000);
      return !failed;
    } catch {
      failed = true;
      return false;
    }
  })();

  // Resolves true once every cancelled search has finished answering, or
  // false if one never does within the timeout (engine wedged).
  function whenIdle(ms){
    if (drain === 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      const w = { resolve, timer: null };
      w.timer = setTimeout(() => { idleWaiters.splice(idleWaiters.indexOf(w), 1); resolve(false); }, ms);
      idleWaiters.push(w);
    });
  }

  // NOTE (learned from testing the real engine): `stop` works promptly, BUT
  // if a new `go` is sent before the stopped search's `bestmove` has come
  // back, the engine silently drops the new search and can wedge for good.
  // So after a cancel we always wait for that old answer (`whenIdle`) before
  // sending anything else, and if it never comes the engine is treated as
  // failed — the game then falls back instead of freezing.
  function cancel(){
    requestSeq++;           // any request still waiting its turn is superseded
    if (!active) return;
    const a = active; active = null;
    clearTimeout(a.timer);
    drain++;                // exactly one `bestmove` will still arrive for it
    send('stop');
    a.resolve(null);
  }

  async function settle(){  // true if the engine is free to take a new command
    if (!(await ready) || failed) return false;
    if (!(await whenIdle(idleTimeoutMs))){ failed = true; return false; }
    return true;
  }

  async function configure({ skill }){
    cancel();
    if (!(await settle())) return;
    send(`setoption name Skill Level value ${skill}`);
    send('isready');
    try { await waitFor(l => l === 'readyok', 8000); } catch { failed = true; }
  }

  async function newGame(){
    cancel();
    if (!(await settle())) return;
    send('ucinewgame');
    send('isready');
    try { await waitFor(l => l === 'readyok', 8000); } catch { failed = true; }
  }

  // Resolves with a UCI move string like "e2e4" or "e7e8q", or null if there
  // is no move, the search was cancelled/superseded, or the engine failed.
  async function bestMove(fen, moveTimeMs){
    cancel();
    const mine = ++requestSeq;
    if (!(await settle()) || mine !== requestSeq) return null;
    return new Promise((resolve) => {
      const a = { resolve, timer: null };
      a.timer = setTimeout(() => {
        if (active !== a) return;
        active = null;
        drain++;            // the engine may still answer late — ignore it
        send('stop');
        resolve(null);
      }, moveTimeMs + 8000);
      active = a;
      send(`position fen ${fen}`);
      send(`go movetime ${moveTimeMs}`);
    });
  }

  function dispose(){
    cancel();
    for (const w of waiters.splice(0)) clearTimeout(w.timer);
    try { worker.terminate && worker.terminate(); } catch {}
  }

  return { ready, configure, newGame, bestMove, cancel, dispose, get failed(){ return failed; } };
}

// Browser: start Stockfish in a real Worker. Returns null if Workers are
// unsupported or can't be created, so callers can fall back gracefully.
export function createBrowserEngine(url = WORKER_URL){
  try {
    if (typeof Worker === 'undefined') return null;
    return createEngine(new Worker(url));
  } catch (err) {
    console.warn('Could not start Stockfish:', err);
    return null;
  }
}

/* ── Translating between the engine's moves and Stockfish's ── */

// "e2e4" / "e7e8q"  →  the matching legal Move from our rules engine, or null
// if Stockfish named a move our engine does not consider legal.
export function findMoveByUci(game, uci){
  if (typeof uci !== 'string' || uci.length < 4) return null;
  const col = (ch) => 'abcdefgh'.indexOf(ch);
  const from = { row: parseInt(uci[1], 10) - 1, col: col(uci[0]) };
  const to   = { row: parseInt(uci[3], 10) - 1, col: col(uci[2]) };
  const promo = { q:'queen', r:'rook', b:'bishop', n:'knight' }[uci[4]] || 'queen';
  return ChessEngine.getAllLegalMoves(game, game.turn).find(m =>
    m.from.row === from.row && m.from.col === from.col &&
    m.to.row === to.row && m.to.col === to.col &&
    (!m.isPromotion || m.promotionType === promo)
  ) || null;
}

// Last-resort fallback so a failed engine can never freeze the game.
export function randomLegalMove(game){
  const moves = ChessEngine.getAllLegalMoves(game, game.turn);
  return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
}