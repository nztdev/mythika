/* ════════════════════════════════════════════════════════════════
   MYTHIKA — CHESS RULES ENGINE
   ════════════════════════════════════════════════════════════════
   Pure game logic: no DOM, no Three.js, no rendering of any kind.
   This is deliberate — it means the engine can be tested completely
   in isolation (see the perft validation used during development)
   before any 3D interaction code has to trust it.

   COORDINATE SYSTEM (matches chess.html's board layout exactly):
     row 0-1 = the player's side (back rank, then pawns)
     row 6-7 = the opponent's side (pawns, then back rank)
     col 0-7 = the a-file through h-file
     'player' pieces move toward increasing row (0 → 7)
     'opponent' pieces move toward decreasing row (7 → 0)

   GAME STATE SHAPE:
     {
       board: board[row][col] = null | { type, side, hasMoved },
       turn: 'player' | 'opponent',
       enPassantTarget: {row,col} | null,
       halfmoveClock: number,   // for the 50-move draw rule
     }

   MOVE SHAPE (as returned by getLegalMoves / getAllLegalMoves):
     {
       from: {row,col}, to: {row,col},
       piece: {type,side,...}, captured: piece|null,
       isEnPassant: bool, isCastle: 'king'|'queen'|null,
       isPromotion: bool   // true if a pawn reaches the far rank;
                            // makeMove() needs a promotion type in
                            // this case (defaults to 'queen')
     }
   ════════════════════════════════════════════════════════════════ */

const ChessEngine = {

  createInitialGame(){
    const board = Array.from({length:8}, () => Array(8).fill(null));
    const backRank = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

    for (let col = 0; col < 8; col++){
      board[0][col] = { type: backRank[col], side: 'player',   hasMoved: false };
      board[1][col] = { type: 'pawn',        side: 'player',   hasMoved: false };
      board[6][col] = { type: 'pawn',        side: 'opponent', hasMoved: false };
      board[7][col] = { type: backRank[col], side: 'opponent', hasMoved: false };
    }

    return { board, turn: 'player', enPassantTarget: null, halfmoveClock: 0 };
  },

  cloneBoard(board){
    return board.map(row => row.map(cell => cell ? {...cell} : null));
  },

  cloneGame(game){
    return {
      board: this.cloneBoard(game.board),
      turn: game.turn,
      enPassantTarget: game.enPassantTarget ? {...game.enPassantTarget} : null,
      halfmoveClock: game.halfmoveClock,
    };
  },

  inBounds(row, col){
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  },

  opponentOf(side){
    return side === 'player' ? 'opponent' : 'player';
  },

  /* ── PSEUDO-LEGAL MOVE GENERATION ──
     "Pseudo-legal" = obeys each piece's movement pattern and board
     occupancy, but does NOT yet check whether the move would leave
     the mover's own king in check. That filter is applied separately
     in getLegalMoves(), once, in one place — rather than duplicating
     check-detection logic inside every piece generator. */

  _slide(board, row, col, side, directions){
    const moves = [];
    for (const [dr, dc] of directions){
      let r = row + dr, c = col + dc;
      while (this.inBounds(r, c)){
        const occupant = board[r][c];
        if (!occupant){
          moves.push({row:r, col:c});
        } else {
          if (occupant.side !== side) moves.push({row:r, col:c}); // capture
          break; // blocked either way — own piece or just captured
        }
        r += dr; c += dc;
      }
    }
    return moves;
  },

  _pseudoPawnMoves(game, row, col, piece){
    const { board, enPassantTarget } = game;
    const dir = piece.side === 'player' ? 1 : -1;
    const startRow = piece.side === 'player' ? 1 : 6;
    const moves = [];

    // Forward one
    if (this.inBounds(row+dir, col) && !board[row+dir][col]){
      moves.push({row:row+dir, col});
      // Forward two, only from the starting rank, only if both squares are clear
      if (row === startRow && !board[row+2*dir][col]){
        moves.push({row:row+2*dir, col, isDoubleStep:true});
      }
    }

    // Diagonal captures (including en passant)
    for (const dc of [-1, 1]){
      const r = row+dir, c = col+dc;
      if (!this.inBounds(r,c)) continue;
      const occupant = board[r][c];
      if (occupant && occupant.side !== piece.side){
        moves.push({row:r, col:c});
      } else if (!occupant && enPassantTarget && enPassantTarget.row===r && enPassantTarget.col===c){
        moves.push({row:r, col:c, isEnPassant:true});
      }
    }

    return moves;
  },

  _pseudoKnightMoves(board, row, col, side){
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const moves = [];
    for (const [dr,dc] of offsets){
      const r=row+dr, c=col+dc;
      if (!this.inBounds(r,c)) continue;
      const occupant = board[r][c];
      if (!occupant || occupant.side !== side) moves.push({row:r,col:c});
    }
    return moves;
  },

  _pseudoKingMoves(game, row, col, piece){
    const { board } = game;
    const moves = [];
    for (let dr=-1; dr<=1; dr++){
      for (let dc=-1; dc<=1; dc++){
        if (dr===0 && dc===0) continue;
        const r=row+dr, c=col+dc;
        if (!this.inBounds(r,c)) continue;
        const occupant = board[r][c];
        if (!occupant || occupant.side !== piece.side) moves.push({row:r,col:c});
      }
    }

    // Castling — only offered as pseudo-legal here; getLegalMoves()
    // still runs the standard check-safety filter on the resulting
    // king position, and we separately verify the squares the king
    // passes through are not attacked (see below), since a normal
    // "does this move leave the king in check" test on the
    // destination alone would miss "castling through check".
    if (!piece.hasMoved){
      const enemySide = this.opponentOf(piece.side);
      const inCheckNow = this.isSquareAttacked(board, row, col, enemySide);
      if (!inCheckNow){
        // Kingside: rook at col 7, squares 5,6 must be empty, king passes through 5,6
        const kingsideRook = board[row][7];
        if (kingsideRook && kingsideRook.type==='rook' && kingsideRook.side===piece.side && !kingsideRook.hasMoved
            && !board[row][5] && !board[row][6]
            && !this.isSquareAttacked(board,row,5,enemySide) && !this.isSquareAttacked(board,row,6,enemySide)){
          moves.push({row, col:6, isCastle:'king'});
        }
        // Queenside: rook at col 0, squares 1,2,3 must be empty (only 2,3 need to be unattacked — the king never touches b-file/col1)
        const queensideRook = board[row][0];
        if (queensideRook && queensideRook.type==='rook' && queensideRook.side===piece.side && !queensideRook.hasMoved
            && !board[row][1] && !board[row][2] && !board[row][3]
            && !this.isSquareAttacked(board,row,3,enemySide) && !this.isSquareAttacked(board,row,2,enemySide)){
          moves.push({row, col:2, isCastle:'queen'});
        }
      }
    }

    return moves;
  },

  // Pseudo-legal destinations for the piece at (row,col), as plain
  // {row,col,...flags} objects (not full Move records — getLegalMoves
  // wraps these into full move records after the check-safety filter).
  _pseudoMovesFor(game, row, col){
    const piece = game.board[row][col];
    if (!piece) return [];
    const { board } = game;
    switch (piece.type){
      case 'pawn':   return this._pseudoPawnMoves(game, row, col, piece);
      case 'knight': return this._pseudoKnightMoves(board, row, col, piece.side);
      case 'bishop': return this._slide(board,row,col,piece.side, [[-1,-1],[-1,1],[1,-1],[1,1]]);
      case 'rook':   return this._slide(board,row,col,piece.side, [[-1,0],[1,0],[0,-1],[0,1]]);
      case 'queen':  return this._slide(board,row,col,piece.side, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      case 'king':   return this._pseudoKingMoves(game, row, col, piece);
      default: return [];
    }
  },

  /* ── ATTACK DETECTION ──
     Is (row,col) attacked by any piece belonging to `bySide`? Used
     both for check detection and for castling-through-check checks.
     Deliberately does NOT use _pseudoMovesFor (which would recurse
     into castling's own attack checks) — pawns/knights/king here use
     their raw attack pattern directly, sliding pieces reuse _slide
     (which has no castling logic, so no recursion risk there). */
  isSquareAttacked(board, row, col, bySide){
    // Pawns: attack diagonally forward from the ATTACKER's perspective
    const pawnDir = bySide === 'player' ? 1 : -1; // player pawns attack toward increasing row
    for (const dc of [-1,1]){
      const r = row - pawnDir, c = col + dc; // reverse-check: would a pawn at (r,c) attack (row,col)?
      if (this.inBounds(r,c)){
        const p = board[r][c];
        if (p && p.type==='pawn' && p.side===bySide) return true;
      }
    }
    // Knights
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of knightOffsets){
      const r=row+dr, c=col+dc;
      if (this.inBounds(r,c)){
        const p = board[r][c];
        if (p && p.type==='knight' && p.side===bySide) return true;
      }
    }
    // King (adjacent squares)
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
      if (dr===0 && dc===0) continue;
      const r=row+dr, c=col+dc;
      if (this.inBounds(r,c)){
        const p = board[r][c];
        if (p && p.type==='king' && p.side===bySide) return true;
      }
    }
    // Sliding pieces: bishop/queen on diagonals, rook/queen on orthogonals
    const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    const orthoDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr,dc] of diagDirs){
      let r=row+dr, c=col+dc;
      while (this.inBounds(r,c)){
        const p = board[r][c];
        if (p){
          if (p.side===bySide && (p.type==='bishop'||p.type==='queen')) return true;
          break;
        }
        r+=dr; c+=dc;
      }
    }
    for (const [dr,dc] of orthoDirs){
      let r=row+dr, c=col+dc;
      while (this.inBounds(r,c)){
        const p = board[r][c];
        if (p){
          if (p.side===bySide && (p.type==='rook'||p.type==='queen')) return true;
          break;
        }
        r+=dr; c+=dc;
      }
    }
    return false;
  },

  findKing(board, side){
    for (let r=0;r<8;r++) for (let c=0;c<8;c++){
      const p = board[r][c];
      if (p && p.type==='king' && p.side===side) return {row:r,col:c};
    }
    return null; // should never happen in a legal game state
  },

  isInCheck(game, side){
    const kingPos = this.findKing(game.board, side);
    if (!kingPos) return false;
    return this.isSquareAttacked(game.board, kingPos.row, kingPos.col, this.opponentOf(side));
  },

  /* ── APPLYING A MOVE (used internally to test check-safety, and
     externally once a move is confirmed legal) ── */
  _applyMoveToBoard(game, from, to, extra, promotionType){
    const next = this.cloneGame(game);
    const board = next.board;
    const piece = board[from.row][from.col];
    const captured = board[to.row][to.col];

    board[from.row][from.col] = null;

    if (extra?.isEnPassant){
      // The captured pawn sits beside the destination, not on it
      board[from.row][to.col] = null;
    }

    const movedPiece = { ...piece, hasMoved: true };
    if (extra?.isPromotion || (piece.type==='pawn' && (to.row===0 || to.row===7))){
      movedPiece.type = promotionType || 'queen';
    }
    board[to.row][to.col] = movedPiece;

    if (extra?.isCastle === 'king'){
      const rook = board[from.row][7];
      board[from.row][7] = null;
      board[from.row][5] = { ...rook, hasMoved: true };
    } else if (extra?.isCastle === 'queen'){
      const rook = board[from.row][0];
      board[from.row][0] = null;
      board[from.row][3] = { ...rook, hasMoved: true };
    }

    // En passant target for the NEXT move only exists if this move
    // was a pawn double-step
    next.enPassantTarget = extra?.isDoubleStep
      ? { row:(from.row+to.row)/2, col: from.col }
      : null;

    next.halfmoveClock = (piece.type==='pawn' || captured) ? 0 : game.halfmoveClock + 1;
    next.turn = this.opponentOf(game.turn);

    return { game: next, captured: extra?.isEnPassant ? game.board[from.row][to.col] : captured };
  },

  /* ── LEGAL MOVES (the check-safety filter happens exactly once,
     here, rather than being duplicated per piece type) ── */
  PROMOTION_TYPES: ['queen','rook','bishop','knight'],

  getLegalMoves(game, row, col){
    const piece = game.board[row][col];
    if (!piece || piece.side !== game.turn) return [];

    const pseudo = this._pseudoMovesFor(game, row, col);
    const legal = [];

    for (const dest of pseudo){
      // Check-safety only needs testing ONCE per destination square —
      // which piece type a pawn promotes to can never change whether
      // the mover's own king ends up in check (removing the pawn from
      // its origin and occupying the destination are both type-agnostic
      // for the purposes of blocking/revealing attacks), so we simulate
      // with an arbitrary promotion type here and reuse the result for
      // all 4 promotion variants below.
      const { game: resultGame } = this._applyMoveToBoard(
        game, {row,col}, {row:dest.row,col:dest.col}, dest, 'queen'
      );
      if (this.isInCheck(resultGame, piece.side)) continue; // illegal — leaves own king in check

      const isPromotion = piece.type==='pawn' && (dest.row===0 || dest.row===7);
      const base = {
        from: {row,col}, to: {row:dest.row, col:dest.col},
        piece, captured: game.board[dest.row][dest.col] || (dest.isEnPassant ? game.board[row][dest.col] : null),
        isEnPassant: !!dest.isEnPassant,
        isCastle: dest.isCastle || null,
        isDoubleStep: !!dest.isDoubleStep,
      };

      if (isPromotion){
        // Standard chess rules (and perft counting convention) treat
        // promoting to each piece type as a DISTINCT legal move, not
        // one move with a choice attached — a pawn reaching the far
        // rank with no other pawns able to make that exact move has
        // FOUR legal moves available here, not one.
        for (const promotionType of this.PROMOTION_TYPES){
          legal.push({ ...base, isPromotion: true, promotionType });
        }
      } else {
        legal.push({ ...base, isPromotion: false, promotionType: null });
      }
    }
    return legal;
  },

  getAllLegalMoves(game, side){
    const moves = [];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++){
      const p = game.board[r][c];
      if (p && p.side===side){
        moves.push(...this.getLegalMoves({...game, turn:side}, r, c));
      }
    }
    return moves;
  },

  // Applies a move that has ALREADY been confirmed legal (via
  // getLegalMoves) and returns the resulting new game state.
  // `promotionType` lets the caller choose what a promoting pawn
  // becomes; defaults to 'queen' if omitted.
  // `promotionType` param is now only a fallback for callers using a
  // hand-built move object without one — moves from getLegalMoves()
  // already carry their own correct promotionType per variant.
  makeMove(game, move, promotionType){
    const { game: next } = this._applyMoveToBoard(
      game, move.from, move.to,
      { isEnPassant: move.isEnPassant, isCastle: move.isCastle, isPromotion: move.isPromotion, isDoubleStep: move.isDoubleStep },
      move.promotionType || promotionType || 'queen'
    );
    return next;
  },

  // 'active' | 'check' | 'checkmate' | 'stalemate'
  getGameStatus(game){
    const inCheck = this.isInCheck(game, game.turn);
    const hasLegalMoves = this.getAllLegalMoves(game, game.turn).length > 0;
    if (inCheck && !hasLegalMoves) return 'checkmate';
    if (!inCheck && !hasLegalMoves) return 'stalemate';
    if (inCheck) return 'check';
    return 'active';
  },

  // Debug/notation helper — e.g. {row:1,col:4} → "e2"
  algebraic(row, col){
    return 'abcdefgh'[col] + (row+1);
  },

  /* ── FEN IMPORT/EXPORT ──
     FEN (Forsyth-Edwards Notation) is the standard text format for
     a chess position. Two reasons this engine supports it beyond
     just the starting position:
       1. It's the standard test format for validating a move
          generator against known-correct positions (see the perft
          tests run during development).
       2. The UCI protocol Stockfish speaks communicates positions
          as FEN strings ("position fen ..."), so this is needed
          for the AI integration regardless.

     NOTE ON CASTLING RIGHTS: this engine tracks castling legality
     via each king/rook's own `hasMoved` flag rather than a separate
     rights bitmask. When loading a FEN, we translate its castling
     rights letters into the right hasMoved flags:
       - if a side has NEITHER kingside nor queenside rights, its
         KING is marked as moved (blocks both, matching a position
         where the king itself moved at some point)
       - if a side is missing ONLY kingside rights, its h-file rook
         is marked as moved (queenside remains available)
       - if a side is missing ONLY queenside rights, its a-file rook
         is marked as moved (kingside remains available) */
  loadFEN(fen){
    const [placement, activeColor, castling, epTarget, halfmove] = fen.trim().split(/\s+/);
    const board = Array.from({length:8}, () => Array(8).fill(null));
    const ranks = placement.split('/'); // ranks[0] = rank 8 (my row 7) ... ranks[7] = rank 1 (my row 0)

    const pieceFromLetter = (ch) => {
      const side = ch === ch.toUpperCase() ? 'player' : 'opponent'; // convention: uppercase(white)='player'
      const map = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
      return { type: map[ch.toLowerCase()], side, hasMoved: false };
    };

    for (let i = 0; i < 8; i++){
      const row = 7 - i; // FEN rank 8 first → my row 7
      let col = 0;
      for (const ch of ranks[i]){
        if (/\d/.test(ch)){ col += parseInt(ch,10); }
        else { board[row][col] = pieceFromLetter(ch); col++; }
      }
    }

    // Castling rights → hasMoved flags (see note above)
    const has = (c) => castling.includes(c);
    const applyCastlingRights = (side, kingsideChar, queensideChar, backRow) => {
      const king = board[backRow][4];
      const kingsideRook = board[backRow][7];
      const queensideRook = board[backRow][0];
      const hasK = has(kingsideChar), hasQ = has(queensideChar);
      if (!hasK && !hasQ){ if (king) king.hasMoved = true; }
      else {
        if (!hasK && kingsideRook) kingsideRook.hasMoved = true;
        if (!hasQ && queensideRook) queensideRook.hasMoved = true;
      }
    };
    if (castling && castling !== '-'){
      applyCastlingRights('player', 'K', 'Q', 0);
      applyCastlingRights('opponent', 'k', 'q', 7);
    } else {
      // No rights at all — block castling for both sides entirely
      if (board[0][4]) board[0][4].hasMoved = true;
      if (board[7][4]) board[7][4].hasMoved = true;
    }

    let enPassantTarget = null;
    if (epTarget && epTarget !== '-'){
      const col = 'abcdefgh'.indexOf(epTarget[0]);
      const row = parseInt(epTarget[1],10) - 1;
      enPassantTarget = { row, col };
    }

    return {
      board,
      turn: activeColor === 'w' ? 'player' : 'opponent',
      enPassantTarget,
      halfmoveClock: halfmove ? parseInt(halfmove,10) : 0,
    };
  },

  toFEN(game){
    const rows = [];
    for (let i = 0; i < 8; i++){
      const row = 7 - i;
      let rankStr = '', empty = 0;
      for (let col = 0; col < 8; col++){
        const p = game.board[row][col];
        if (!p){ empty++; continue; }
        if (empty > 0){ rankStr += empty; empty = 0; }
        const letters = {pawn:'p',knight:'n',bishop:'b',rook:'r',queen:'q',king:'k'};
        const ch = letters[p.type];
        rankStr += p.side === 'player' ? ch.toUpperCase() : ch;
      }
      if (empty > 0) rankStr += empty;
      rows.push(rankStr);
    }
    const placement = rows.join('/');
    const active = game.turn === 'player' ? 'w' : 'b';

    let castling = '';
    const king0 = game.board[0][4], rookA0 = game.board[0][0], rookH0 = game.board[0][7];
    const king7 = game.board[7][4], rookA7 = game.board[7][0], rookH7 = game.board[7][7];
    if (king0 && !king0.hasMoved && rookH0 && !rookH0.hasMoved) castling += 'K';
    if (king0 && !king0.hasMoved && rookA0 && !rookA0.hasMoved) castling += 'Q';
    if (king7 && !king7.hasMoved && rookH7 && !rookH7.hasMoved) castling += 'k';
    if (king7 && !king7.hasMoved && rookA7 && !rookA7.hasMoved) castling += 'q';
    if (!castling) castling = '-';

    const ep = game.enPassantTarget ? this.algebraic(game.enPassantTarget.row, game.enPassantTarget.col) : '-';

    return `${placement} ${active} ${castling} ${ep} ${game.halfmoveClock||0} 1`;
  },
};