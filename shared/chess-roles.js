/* ════════════════════════════════════════════════════════════════
   MYTHIKA — CHESS ROLE MAPPING
   ════════════════════════════════════════════════════════════════
   Suggests which of a player's unlocked characters best fit each
   chess piece role (King, Queen, Bishop, Knight, Rook, Pawn), so a
   sensible default loadout can be offered instantly instead of
   forcing the player to hand-assign 16 pieces before their first
   game.

   DESIGN CHOICE: this is a SCORING FUNCTION over each character's
   existing `archetype` and `stats` fields (already in roster.js),
   not a hand-authored "character X plays role Y" table. This means:
   - Every character added to roster.js in the future automatically
     gets sensible chess-role suggestions with zero extra work.
   - roster.js itself stays free of any chess-specific field, per
     the "roster.js is the only file casual contributors touch"
     principle established when the roster schema was written.
   - The scoring logic lives here, separately, where it can change
     independently of the character data it reads.

   ONLY THE PLAYER'S OWN SIDE is skinned with characters. The
   opponent (AI) side always uses a fixed, uniform "Shadow" skin —
   see chess.html. This is a deliberate design choice, not a
   limitation: it means a player only ever needs to unlock ONE full
   set (16 characters) to play, not 32, and it gives the opposing
   side a distinct, thematically fitting "faceless Chronicle shadow"
   identity rather than requiring narrative justification for why
   the AI has spirits too.
   ════════════════════════════════════════════════════════════════ */

const ChessRoles = {
  // Pieces on one side. Owning this many spirits skins the whole side;
  // with fewer, the best-fitting ones are used and the rest stay generic.
  MIN_CHARACTERS: 16,

  // Archetype → role affinity bonus. A character whose archetype
  // appears in a role's list gets a flat bonus added to that role's
  // stat-based score. Purely additive — a character with no matching
  // archetype can still be suggested for a role on stats alone.
  ARCHETYPE_AFFINITY: {
    king:   ['Sovereign'],
    queen:  ['Sovereign', 'Hero'],
    bishop: ['Sage', 'Oracle', 'Scholar', 'Creator'],
    knight: ['Warrior', 'Trickster', 'Rogue', 'Explorer'],
    rook:   ['Guardian', 'Berserker', 'Strategist'],
    pawn:   [], // pawns favour low rarity over archetype — see _score()
  },
  AFFINITY_BONUS: 30,

  // Per-role stat weighting. Each role cares about different stats,
  // reflecting how that piece actually plays on the board:
  //   King   — protected, not a fighter: Wisdom + Fortune matter more than raw Power
  //   Queen  — the board's most powerful piece: rewards overall strength
  //   Bishop — moves along sightlines: Wisdom-weighted ("far-seeing")
  //   Knight — the board's most agile piece: Speed-weighted
  //   Rook   — a fortress that hits hard in straight lines: Power-weighted
  //   Pawn   — the everyman foot soldier: rarity is weighted DOWN, not up
  _score(card, role){
    const s = card.stats;
    let score = 0;
    switch(role){
      case 'king':   score = s.Wisdom*0.5 + s.Fortune*0.5; break;
      case 'queen':  score = s.Power*0.35 + s.Speed*0.25 + s.Wisdom*0.25 + s.Fortune*0.15; break;
      case 'bishop': score = s.Wisdom*0.7 + s.Fortune*0.3; break;
      case 'knight': score = s.Speed*0.7 + s.Power*0.3; break;
      case 'rook':   score = s.Power*0.7 + s.Wisdom*0.3; break;
      case 'pawn':   score = (100 - card.rarity*15) + s.Fortune*0.2; break; // lower rarity scores HIGHER
    }
    if (this.ARCHETYPE_AFFINITY[role]?.includes(card.archetype)) {
      score += this.AFFINITY_BONUS;
    }
    return score;
  },

  // Greedy assignment: fills the most restrictive/important roles
  // first (King, then Queen, then paired roles, then Pawns), each
  // time picking the best-scoring character still available. This
  // is a simple heuristic, not an optimal assignment — it's meant to
  // produce a good-enough instant default, not solve a matching
  // problem perfectly. The player can always override any slot
  // manually afterward.
  //
  // How many pieces of each kind one side has.
  SLOTS: { king: 1, queen: 1, bishop: 2, knight: 2, rook: 2, pawn: 8 },

  // Works with ANY number of unlocked characters, including none. Returns 16
  // slots; a piece left without a character is null (drawn with a generic
  // medallion).
  //   1. A character that names its role (`chessRole` in roster.js) gets it,
  //      if the player owns them and that role still has room — so King
  //      Arthur is always the King. (Stats alone made him the Queen.)
  //   2. Every other slot goes to the best-fitting remaining character, most
  //      prominent role first (King, Queen, Bishops, Knights, Rooks, Pawns).
  suggestLoadout(unlockedIds){
    const remaining = ROSTER.filter(c => unlockedIds.includes(c.id));
    const placed = { king: [], queen: [], bishop: [], knight: [], rook: [], pawn: [] };

    for (const c of [...remaining]){
      const role = c.chessRole;
      if (role && placed[role] && placed[role].length < this.SLOTS[role]){
        placed[role].push(c);
        remaining.splice(remaining.indexOf(c), 1);
      }
    }

    const takeBest = (role) => {
      if (!remaining.length) return null;
      remaining.sort((a,b) => this._score(b,role) - this._score(a,role));
      return remaining.shift();
    };
    for (const role of ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn']){
      while (placed[role].length < this.SLOTS[role]) placed[role].push(takeBest(role));
    }

    return {
      king: placed.king[0], queen: placed.queen[0],
      bishops: placed.bishop, knights: placed.knight, rooks: placed.rook, pawns: placed.pawn,
    };
  }
};