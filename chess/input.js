/* ════════════════════════════════════════════════════════════════
   chess/input.js — taps, picking a square, and the promotion picker
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { N } from './config.js';
import { session } from './session.js';
import { selectSquare, clearSelection } from './selection.js';
import { executeMove } from './game.js';
import { openPromotionOverlay, closePromotionOverlay } from './ui.js';

const pointer = new THREE.Vector2();
let pointerStart = null;

/* ── PICKING (screen position → board square) ── */
export function pickSquareAt(clientX, clientY){
  const { renderer, camera, raycaster } = session;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const targets = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
    if (session.pieceMeshes[r][c]) targets.push(session.pieceMeshes[r][c]);
    targets.push(session.squareMeshes[r][c]);
  }
  const hits = raycaster.intersectObjects(targets, true);
  for (const h of hits){
    let o = h.object;
    while (o){
      if (o.userData && (o.userData.isPiece || o.userData.isBoardSquare)){
        return { row: o.userData.row, col: o.userData.col };
      }
      o = o.parent;
    }
  }
  return null;
}

/* ── POINTER EVENTS ── A drag orbits the camera; only a short, still press
   counts as a tap. */
export function attachInput(domElement){
  domElement.addEventListener('pointerdown', (e) => {
    pointerStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  domElement.addEventListener('pointerup', (e) => {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
    const dt = performance.now() - pointerStart.t;
    pointerStart = null;
    if (Math.hypot(dx, dy) > 10 || dt > 700) return; // a drag (orbit), not a tap
    handleTap(e.clientX, e.clientY);
  });
}

function inputLocked(){
  return session.animating || session.gameOver || !!session.pendingPromotion;
}

export function handleTap(clientX, clientY){
  if (inputLocked()) return;
  const sq = pickSquareAt(clientX, clientY);
  if (sq) onSquareTapped(sq.row, sq.col);
}

/* ── WHAT A TAP ON A SQUARE MEANS ── */
export function onSquareTapped(row, col){
  if (inputLocked()) return;

  if (session.selected){
    if (session.selected.row === row && session.selected.col === col){ clearSelection(); return; }
    const movesHere = session.legalMoves.filter(m => m.to.row === row && m.to.col === col);
    if (movesHere.length){
      // A promoting pawn has four variants for the same square — ask which.
      if (movesHere[0].isPromotion) openPromotionPicker(movesHere);
      else executeMove(movesHere[0]);
      return;
    }
  }

  const piece = session.game.board[row][col];
  if (piece && piece.side === session.game.turn) selectSquare(row, col);
  else clearSelection();
}

/* ── PROMOTION PICKER ── */
export function openPromotionPicker(moves){
  session.pendingPromotion = moves;
  openPromotionOverlay();
}
export function choosePromotion(type){
  if (!session.pendingPromotion) return;
  const move = session.pendingPromotion.find(m => m.promotionType === type);
  session.pendingPromotion = null;
  closePromotionOverlay();
  if (move) executeMove(move);
}
export function cancelPromotion(){
  session.pendingPromotion = null;
  closePromotionOverlay();
  clearSelection();
}