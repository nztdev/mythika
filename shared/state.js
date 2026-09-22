/* ════════════════════════════════════════════════════════════════
   MYTHIKA — SHARED STATE
   ════════════════════════════════════════════════════════════════
   Every Mythika game (gacha, battle, chess, memory match, trivia)
   loads this file. It reads and writes the SAME localStorage keys,
   so a gem earned in one game is spent in another, and a character
   unlocked in the gacha app is immediately available as a chess
   skin or memory-match card elsewhere — no sync code needed, this
   works automatically because localStorage is shared by origin
   (domain), not by page.

   DO NOT rename the localStorage keys below ('mk_gems' etc.) —
   doing so orphans every existing player's save data.

   Load order: this file depends on nothing. Load it before any
   game-specific script that reads `State` or `ROSTER`-based
   unlock checks.
   ════════════════════════════════════════════════════════════════ */

function LS(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}}
function LSset(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

const State={
  gems:    LS('mk_gems',120),
  unlocked:LS('mk_unlocked',[]),   // array of ROSTER `id` strings
  lastFree:LS('mk_lastFree',0),
  wins:    LS('mk_wins',0),

  save(){
    LSset('mk_gems',this.gems);
    LSset('mk_unlocked',this.unlocked);
    LSset('mk_lastFree',this.lastFree);
    LSset('mk_wins',this.wins);
  },

  // Unlocks a character by id. Returns true if this was a NEW unlock
  // (false if the player already owned it) — callers use this to
  // decide whether to show a "New!" badge.
  unlock(id){
    if(!this.unlocked.includes(id)){
      this.unlocked.push(id);
      this.save();
      return true;
    }
    return false;
  },

  freeReady(){ return Date.now()-this.lastFree>23*60*60*1000; }
};
