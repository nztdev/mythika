/* ════════════════════════════════════════════════════════════════
   chess/config.js — constants and the board↔world mapping
   ════════════════════════════════════════════════════════════════
   Everything a person would tweak to restyle the board lives here:
   colours, animation speed, and the team materials. No logic.
   ════════════════════════════════════════════════════════════════ */

export const CONFIG = {
  boardSize: 8,
  squareSize: 1,
  // Mid-tone squares on purpose: white pieces need squares darker than
  // themselves and black pieces need squares lighter than themselves, on
  // BOTH colours. A near-black board made black pieces vanish.
  lightSquareColor: 0xb9a074,
  darkSquareColor: 0x5c4b72,
  playerAccent: 0xc9a84c,   // gold — the player's medallion studs
  shadowAccent: 0x6b5b95,   // muted violet — the Shadow side's studs
  moveDurationMs: 380,
  moveLift: 0.45,
};

export const N = CONFIG.boardSize;
export const S = CONFIG.squareSize;
export const OFFSET = (N * S) / 2 - S / 2;

// Piece materials per team. These are materials (colour + sheen), not flat
// colours, so they read as ivory and polished obsidian rather than paint.
export const TEAM_STYLES = {
  ivory:    { body: 0xe9e1cd, roughness: 0.42, metalness: 0.10, trim: 0xc9a84c },
  obsidian: { body: 0x17141f, roughness: 0.32, metalness: 0.45, trim: 0x8b7cf6 },
};

// Who wears what. A team-colour picker only needs to change these two
// entries (the object is intentionally mutable).
export const SIDE_STYLE = { player: 'ivory', opponent: 'obsidian' };

/* COORDINATES: the engine's row 0 is the player's back rank and row 7 is
   the Shadow's. Row 0 is placed NEAREST the camera (+z) so you always play
   from your own end of the board, a-file on your left, like a real board. */
export function squareToWorld(row, col){
  return { x: col * S - OFFSET, z: OFFSET - row * S };
}