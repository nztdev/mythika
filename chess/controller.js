/* ════════════════════════════════════════════════════════════════
   chess/controller.js — who is playing, and what happens between moves
   ════════════════════════════════════════════════════════════════
   Modes (session.match.mode):
     intro  AI vs AI demo behind the "tap to begin" screen
     menu   the match chooser (board reset, nobody can move)
     pass   Pass & Play — both sides are human
     ai     human (ivory) vs the Shadow (Stockfish)

   `session.match.controllers` says who may move each side. input.js only
   accepts taps for 'human'; this file moves the 'ai' side.

   Every async step carries `session.aiToken`: starting a new match, going to
   the menu, or leaving bumps it, so a late answer from an old search can
   never move a piece in a game it doesn't belong to.
   ════════════════════════════════════════════════════════════════ */
import { session } from './session.js';
import { CONFIG } from './config.js';
import { DIFFICULTY, createBrowserEngine, findMoveByUci, randomLegalMove } from './ai.js';
import { restartGame, executeMove } from './game.js';
import * as ui from './ui.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const match = () => session.match;

/* ── The engine (one Stockfish worker, created on first use) ── */
let engineFactory = createBrowserEngine;
let engine = null;
let engineRequested = false;

// Tests replace the factory so no real worker is needed.
export function setEngineFactory(factory){
  if (engine && engine.dispose) engine.dispose();
  engineFactory = factory; engine = null; engineRequested = false;
}

// Resolves with a ready engine, or null if the computer opponent can't run.
export async function getEngine(){
  if (!engineRequested){ engineRequested = true; engine = engineFactory(); }
  if (!engine) return null;
  return (await engine.ready) ? engine : null;
}

/* ── Small helpers ── */
export function isAiTurn(){
  return !session.gameOver && match().controllers[session.game.turn] === 'ai';
}

function cancelAi(){
  session.aiToken++;                       // anything still in flight is now stale
  if (engine && engine.cancel) engine.cancel();
}

const PREFS_KEY = 'mk_chess_prefs';
const DEFAULT_PREFS = { opponent: 'ai', difficulty: 'adept', side: 'first' };

/* ── Starting things ── */
let lastConfig = null;

export async function startMatch(cfg){
  cancelAi();
  const token = session.aiToken;
  let mode = cfg.mode;
  let eng = null;
  let notice = '';

  if (mode === 'ai'){
    ui.setStartBusy(true);
    eng = await getEngine();
    ui.setStartBusy(false);
    if (token !== session.aiToken) return;          // the player moved on while we waited
    if (!eng){
      mode = 'pass';
      notice = 'The computer opponent could not load, so both sides are yours.';
    }
  }

  lastConfig = { ...cfg };
  const difficulty = DIFFICULTY[cfg.difficulty] ? cfg.difficulty : 'adept';
  match().mode = mode;
  match().difficulty = difficulty;
  match().demoPlies = 0;
  match().paused = false;
  match().controllers = mode === 'ai'
    ? { player: 'human', opponent: 'ai' }
    : { player: 'human', opponent: 'human' };

  restartGame();

  // "You move second" = the Shadow takes the first turn. Colours stay as they
  // are (cosmetic); only who starts changes. Stockfish is told the position
  // as a FEN with that side to move, so no special handling is needed.
  const humanFirst = cfg.side === 'random' ? Math.random() < 0.5 : cfg.side !== 'second';
  if (mode === 'ai' && !humanFirst) session.game.turn = 'opponent';
  ui.updateTurnIndicator(session.game.turn, 'active', null);

  ui.hideIntro();
  ui.hideMenu();
  ui.setMenuButtonVisible(true);
  ui.setMenuButtonArmed(false);
  ui.setBanner(mode === 'ai'
    ? `<strong>vs the Shadow · ${DIFFICULTY[difficulty].label}</strong> · tap a piece, then a glowing square`
    : `<strong>Pass &amp; Play</strong> · tap a piece, then a glowing square${notice ? ' · ' + notice : ''}`);

  if (mode === 'ai'){
    await eng.configure({ skill: DIFFICULTY[difficulty].skill });
    await eng.newGame();
    if (token !== session.aiToken) return;
    driveAi();
  }
}

export function rematch(){
  return startMatch(lastConfig || { mode: 'pass' });
}

export function showMenu(){
  cancelAi();
  match().mode = 'menu';
  match().controllers = { player: 'none', opponent: 'none' };
  restartGame();                            // a fresh board behind the menu
  ui.setStatus('Choose your match', '');
  ui.hideIntro();
  ui.setMenuNotice('');
  ui.setStartBusy(false);
  ui.setMenuButtonVisible(false);
  ui.setBanner('<strong>Chess</strong> · choose how you want to play');
  ui.showMenu();
}

export async function startIntro(){
  cancelAi();
  const token = session.aiToken;
  match().mode = 'intro';
  match().difficulty = 'demo';
  match().demoPlies = 0;
  match().paused = false;
  match().controllers = { player: 'ai', opponent: 'ai' };
  restartGame();
  ui.hideMenu();
  ui.setMenuButtonVisible(false);
  ui.setBanner('<strong>Chess</strong>');
  ui.showIntro();

  const eng = await getEngine();            // no engine → a still board behind the title; nothing breaks
  if (!eng || token !== session.aiToken) return;
  await eng.configure({ skill: DIFFICULTY.demo.skill });
  await eng.newGame();
  if (token !== session.aiToken) return;
  driveAi();
}

/* ── The computer's turn ── */
async function driveAi(){
  if (!isAiTurn()) return;
  const token = session.aiToken;
  const demo = match().mode === 'intro';
  const level = DIFFICULTY[demo ? 'demo' : match().difficulty];
  const eng = await getEngine();
  if (token !== session.aiToken || !eng) return;

  if (!demo) ui.setThinking();
  const uci = await eng.bestMove(ChessEngine.toFEN(session.game), level.moveTimeMs);
  if (token !== session.aiToken) return;    // a new match/menu superseded this answer

  // Never let a bad answer freeze the game: if the engine failed, or named a
  // move our rules engine rejects, play a random legal move instead.
  let move = findMoveByUci(session.game, uci);
  if (!move) move = randomLegalMove(session.game);
  if (!move) return;                        // no legal moves: the game is already over

  await sleep(demo ? CONFIG.demoMoveDelayMs : CONFIG.aiMoveDelayMs);
  if (token !== session.aiToken || session.animating || session.gameOver) return;
  executeMove(move);
}

/* ── After every move (called by game.js) ── */
export function afterMove(){
  match().demoPlies++;
  const token = session.aiToken;

  if (session.gameOver){
    if (match().mode === 'intro'){
      setTimeout(() => { if (token === session.aiToken && match().mode === 'intro') startIntro(); }, CONFIG.demoRestartDelayMs);
    } else {
      // Let the final move land visibly before the overlay covers it
      setTimeout(() => {
        if (token === session.aiToken && session.gameOver && session.result) ui.showGameOver(session.result);
      }, 800);
    }
    return;
  }
  if (match().mode === 'intro' && match().demoPlies >= CONFIG.demoMaxPlies){
    setTimeout(() => { if (token === session.aiToken && match().mode === 'intro') startIntro(); }, CONFIG.demoRestartDelayMs);
    return;
  }
  driveAi();
}

/* ── Wiring to the page ── */
let armTimer = null;
function onMenuButton(){
  if (armTimer){ clearTimeout(armTimer); armTimer = null; ui.setMenuButtonArmed(false); showMenu(); return; }
  ui.setMenuButtonArmed(true);
  armTimer = setTimeout(() => { armTimer = null; ui.setMenuButtonArmed(false); }, 2500);
}

function onStart(){
  const c = ui.readMenuChoices();
  try { LSset(PREFS_KEY, c); } catch {}
  startMatch({ mode: c.opponent === 'pass' ? 'pass' : 'ai', difficulty: c.difficulty, side: c.side });
}

export function initController(){
  session.onMoveFinished = afterMove;
  let prefs = DEFAULT_PREFS;
  try { prefs = { ...DEFAULT_PREFS, ...LS(PREFS_KEY, DEFAULT_PREFS) }; } catch {}
  ui.setMenuChoices(prefs);
  ui.bindMenuHandlers({ onIntroTap: showMenu, onStart, onMenuButton });

  // A demo should not burn battery in a background tab
  if (typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('visibilitychange', () => {
      if (match().mode !== 'intro') return;
      if (document.hidden){ cancelAi(); match().paused = true; }
      else if (match().paused){ match().paused = false; driveAi(); }
    });
  }
}