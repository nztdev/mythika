/* ════════════════════════════════════════════════════════════════
   chess/session.js — the one shared, mutable state object
   ════════════════════════════════════════════════════════════════
   Every module reads and writes this single object instead of passing
   state around or exporting `let` bindings (which other modules can't
   reassign). Keeping all runtime state in one place also makes it easy
   to see what the game "is" at any moment while debugging.
   ════════════════════════════════════════════════════════════════ */
import { N } from './config.js';

const grid = () => Array.from({ length: N }, () => Array(N).fill(null));

export const session = {
  // three.js objects (created by scene.js)
  scene: null, camera: null, renderer: null, controls: null, raycaster: null,

  // [row][col] lookup grids, kept in lockstep with game.board so any move,
  // capture or highlight is an O(1) lookup, never a scene-graph search.
  squareMeshes: grid(),
  pieceMeshes: grid(),

  // the rules engine's game state — the single source of truth for legality
  game: null,

  // interaction state
  selected: null,          // {row,col} of the selected piece
  legalMoves: [],          // engine Move[] for the selected piece
  highlights: [],          // destination markers currently on the board
  selectionRing: null,
  checkRing: null,
  animating: false,        // true while a move's animation plays
  gameOver: false,
  pendingPromotion: null,  // the 4 promotion variants while the picker is open
  result: null,            // set when the position is game-over: {icon,title,sub}

  // Who is playing, set by controller.js.
  //   mode: 'intro' (AI vs AI demo) | 'menu' | 'pass' | 'ai'
  //   controllers: who may move each side — 'human' | 'ai' | 'none'
  match: {
    mode: 'menu',
    controllers: { player: 'none', opponent: 'none' },
    difficulty: 'adept',
    demoPlies: 0,
    paused: false,
  },
  aiToken: 0,              // bumped whenever a match starts/ends: stale AI answers are discarded
  onMoveFinished: null,    // called by game.js after every completed move
};