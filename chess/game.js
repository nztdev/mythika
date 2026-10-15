/* ════════════════════════════════════════════════════════════════
   chess/game.js — playing a move and judging the position
   ════════════════════════════════════════════════════════════════
   The rules engine (shared/chess-engine.js) decides what is legal. This
   file applies a confirmed move to BOTH the engine state and the 3D
   scene (captures, castling's rook, en passant's off-square pawn,
   promotion), then asks the engine whether the game is over.
   ════════════════════════════════════════════════════════════════ */
import { CONFIG, N, squareToWorld } from './config.js';
import { session } from './session.js';
import { buildPiece, placePiece } from './pieces.js';
import { startTweens, clearTweens } from './anim.js';
import { showCheckRing, hideCheckRing } from './overlays.js';
import { clearSelection } from './selection.js';
import { updateTurnIndicator, showGameOver, hideGameOver, closePromotionOverlay } from './ui.js';

/* ── STARTING POSITION ── */
export function setupPieces(){
  session.game = ChessEngine.createInitialGame();

  const backRank = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

  // Player loadout — auto-suggested from unlocked characters; falls back to
  // null cards (generic medallions) below 16 unlocked, so the board always works.
  const loadout = ChessRoles.suggestLoadout(State.unlocked) || {
    king:null, queen:null, bishops:[null,null], knights:[null,null], rooks:[null,null], pawns:Array(8).fill(null)
  };
  const [rookA, rookH] = loadout.rooks;
  const [knightB, knightG] = loadout.knights;
  const [bishopC, bishopF] = loadout.bishops;
  const playerBack = [rookA, knightB, bishopC, loadout.queen, loadout.king, bishopF, knightG, rookH];

  backRank.forEach((role, col) => placePiece(role, true, playerBack[col], 0, col));
  loadout.pawns.forEach((card, col) => placePiece('pawn', true, card, 1, col));

  for (let col = 0; col < N; col++) placePiece('pawn', false, null, 6, col);
  backRank.forEach((role, col) => placePiece(role, false, null, 7, col));
}

/* ── EXECUTING A MOVE ── */
export function executeMove(move){
  if (session.animating) return;
  clearSelection();
  session.animating = true;
  hideCheckRing();

  session.game = ChessEngine.makeMove(session.game, move);

  const grid = session.pieceMeshes;
  const moving = grid[move.from.row][move.from.col];

  // En passant captures the pawn BESIDE the destination (same row the
  // mover started on), not the piece on the destination square.
  const capRow = move.isEnPassant ? move.from.row : move.to.row;
  const capturedMesh = move.captured ? grid[capRow][move.to.col] : null;
  if (capturedMesh) grid[capRow][move.to.col] = null;

  grid[move.from.row][move.from.col] = null;
  grid[move.to.row][move.to.col] = moving;
  moving.userData.row = move.to.row;
  moving.userData.col = move.to.col;

  const tweens = [{ obj: moving, to: squareToWorld(move.to.row, move.to.col), lift: CONFIG.moveLift }];

  // Castling moves the rook too, in the same animation.
  if (move.isCastle){
    const row = move.from.row;
    const rookFromCol = move.isCastle === 'king' ? 7 : 0;
    const rookToCol   = move.isCastle === 'king' ? 5 : 3;
    const rook = grid[row][rookFromCol];
    grid[row][rookFromCol] = null;
    grid[row][rookToCol] = rook;
    rook.userData.col = rookToCol;
    tweens.push({ obj: rook, to: squareToWorld(row, rookToCol), lift: CONFIG.moveLift * 0.6 });
  }

  startTweens(tweens, () => finishMove(move, capturedMesh));
}

function finishMove(move, capturedMesh){
  if (capturedMesh) session.scene.remove(capturedMesh);

  if (move.isPromotion){
    // Rebuild the pawn as its new role, keeping the same character's portrait
    const old = session.pieceMeshes[move.to.row][move.to.col];
    session.scene.remove(old);
    const promoted = buildPiece(move.promotionType, old.userData.isPlayerSide, old.userData.card);
    const p = squareToWorld(move.to.row, move.to.col);
    promoted.position.set(p.x, 0, p.z);
    promoted.userData.row = move.to.row;
    promoted.userData.col = move.to.col;
    session.pieceMeshes[move.to.row][move.to.col] = promoted;
    session.scene.add(promoted);
  }

  session.animating = false;
  evaluatePosition();
}

/* ── GAME STATE EVALUATION ── */
// Only bare kings, or a lone knight/bishop against a bare king, can't force
// mate. (Same-colour-bishop endings etc. are not special-cased.)
export function isInsufficientMaterial(board){
  const rest = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
    const p = board[r][c];
    if (p && p.type !== 'king') rest.push(p.type);
  }
  if (rest.length === 0) return true;
  if (rest.length === 1 && (rest[0] === 'bishop' || rest[0] === 'knight')) return true;
  return false;
}

export function evaluatePosition(){
  const game = session.game;
  const status = ChessEngine.getGameStatus(game);
  const turn = game.turn;
  let over = null;

  if (status === 'checkmate'){
    over = {
      icon: '♛', title: 'Checkmate',
      sub: turn === 'opponent' ? 'Your side wins — the Shadows fall.' : 'The Shadow side wins.',
    };
  } else if (status === 'stalemate'){
    over = { icon: '⚖', title: 'Stalemate', sub: 'A draw — no legal moves, but no check.' };
  } else if (game.halfmoveClock >= 100){
    over = { icon: '⚖', title: 'Draw', sub: 'Fifty moves without a capture or pawn move.' };
  } else if (isInsufficientMaterial(game.board)){
    over = { icon: '⚖', title: 'Draw', sub: 'Neither side has enough material to force checkmate.' };
  }

  if (status === 'check' || status === 'checkmate'){
    const k = ChessEngine.findKing(game.board, turn);
    if (k) showCheckRing(k.row, k.col);
  } else {
    hideCheckRing();
  }

  updateTurnIndicator(turn, status, over);

  if (over){
    session.gameOver = true;
    // Let the final move land visibly before the overlay covers it
    setTimeout(() => { if (session.gameOver) showGameOver(over); }, 800);
  }
}

export function restartGame(){
  clearTweens();
  session.animating = false;
  session.gameOver = false;
  session.pendingPromotion = null;
  clearSelection();
  hideCheckRing();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
    if (session.pieceMeshes[r][c]){
      session.scene.remove(session.pieceMeshes[r][c]);
      session.pieceMeshes[r][c] = null;
    }
  }
  hideGameOver();
  closePromotionOverlay();
  setupPieces();
  updateTurnIndicator(session.game.turn, 'active', null);
}