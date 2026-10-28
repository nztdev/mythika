/* ════════════════════════════════════════════════════════════════
   chess/main.js — boot and wiring (the only file chess.html loads)
   ════════════════════════════════════════════════════════════════
   MODULE MAP (each file does one job; lower rows never import upper rows):

     main.js        boot + wiring
     controller.js  modes, whose turn it is, AI turns, intro demo, menu
     input.js       taps, picking, promotion picker
     game.js        applying moves, game-over rules
     ai.js          Stockfish over UCI (worker-agnostic, fully tested)
     selection.js   selecting a piece, showing legal destinations
     scene.js       renderer, camera framing, lights, render loop
     pieces.js      building one 3D piece          board.js     the board
     overlays.js    rings and move markers          anim.js      tweens
     ui.js          HTML overlays                   session.js   shared state
     config.js      colours, materials, constants

   Rules live in shared/chess-engine.js (no 3D, fully unit-tested).
   ════════════════════════════════════════════════════════════════ */
import { session } from './session.js';
import { initScene, onResize, startRenderLoop } from './scene.js';
import { buildBoard } from './board.js';
import { createOverlays, pulseMarkers } from './overlays.js';
import { setupPieces } from './game.js';
import { attachInput, choosePromotion, cancelPromotion } from './input.js';
import { updateAnimations } from './anim.js';
import { initController, startIntro, showMenu, rematch } from './controller.js';
import { updateTurnIndicator, bindPromotionHandlers, hideLoadingOverlay, showBootError } from './ui.js';

// A missing script (typo'd path, file not uploaded) used to surface as a
// vague ReferenceError blamed on WebGL. Check up front and name the file.
export function missingDependencies(){
  const missing = [];
  if (typeof ROSTER === 'undefined')      missing.push('shared/roster.js');
  if (typeof State === 'undefined')       missing.push('shared/state.js');
  if (typeof Art === 'undefined')         missing.push('shared/art.js');
  if (typeof ChessRoles === 'undefined')  missing.push('shared/chess-roles.js');
  if (typeof ChessEngine === 'undefined') missing.push('shared/chess-engine.js');
  return missing;
}

function boot(){
  const missing = missingDependencies();
  if (missing.length){
    const e = new Error('Missing file' + (missing.length > 1 ? 's' : '') + ': ' + missing.join(', ') +
      '. Make sure ' + (missing.length > 1 ? 'they are' : 'it is') + ' uploaded to your site at exactly that path.');
    e.isMissingFiles = true;
    throw e;
  }

  initScene();
  buildBoard();
  createOverlays();
  setupPieces();
  updateTurnIndicator(session.game.turn, 'active', null);

  attachInput(session.renderer.domElement);
  bindPromotionHandlers({ onChoose: choosePromotion, onCancel: cancelPromotion });
  window.addEventListener('resize', onResize);
  startRenderLoop((now) => { updateAnimations(now); pulseMarkers(now); });

  initController();
}

try {
  boot();
  setTimeout(hideLoadingOverlay, 400);
  // The page opens on the "tap to begin" intro, with the computer playing itself
  startIntro().catch((err) => console.warn('Intro could not start:', err));
} catch (err) {
  console.error('Chess scene failed to initialise:', err);
  showBootError(err.isMissingFiles
    ? err.message
    : 'Something went wrong setting up the 3D board: ' + (err?.message || 'unknown error') +
      '. Your browser may not support WebGL.');
}

// Buttons in the page's HTML call these (game-over screen)
window.ChessGame = { restart: rematch, menu: showMenu };