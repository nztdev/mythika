/* ════════════════════════════════════════════════════════════════
   chess/selection.js — selecting a piece and showing where it can go
   ════════════════════════════════════════════════════════════════
   Kept separate from input.js because both input.js (a tap selects) and
   game.js (a move clears the selection) need it — putting it in either
   would force those two to import each other.
   ════════════════════════════════════════════════════════════════ */
import { N } from './config.js';
import { session } from './session.js';
import { showSelectionRing, hideSelectionRing, addMarker, clearMarkers } from './overlays.js';

export function selectSquare(row, col){
  clearSelection();
  session.selected = { row, col };
  session.legalMoves = ChessEngine.getLegalMoves(session.game, row, col);
  showSelectionRing(row, col);

  const seen = new Set();
  for (const m of session.legalMoves){
    const key = m.to.row * N + m.to.col;
    if (seen.has(key)) continue; // promotion variants share a square
    seen.add(key);
    addMarker(m.to.row, m.to.col, !!m.captured);
  }
}

export function clearSelection(){
  clearMarkers();
  hideSelectionRing();
  session.selected = null;
  session.legalMoves = [];
}