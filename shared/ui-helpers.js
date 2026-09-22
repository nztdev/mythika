/* ════════════════════════════════════════════════════════════════
   MYTHIKA — SHARED UI HELPERS
   ════════════════════════════════════════════════════════════════
   Small, dependency-free display utilities for rendering a
   character's rarity (1-5 stars) consistently across every game.
   Requires the .rstar CSS class to be defined in each page's
   stylesheet (colour/size are set by the page; these functions
   only supply the ★/☆ characters and per-star colour).
   ════════════════════════════════════════════════════════════════ */

const RARITY_COLORS = {1:'#9ba8b5',2:'#4cc9f0',3:'#c9a84c',4:'#c77dff',5:'#ff6b6b'};

// Returns an HTML string of 5 <span class="rstar"> stars, filled
// up to `r` in that rarity's colour, the rest dimmed and hollow.
function starsHTML(r){
  const c = RARITY_COLORS[r];
  return Array.from({length:5},(_,i)=>
    `<span class="rstar" style="color:${i<r?c:'rgba(255,255,255,.14)'}">${i<r?'★':'☆'}</span>`
  ).join('');
}

// Returns a CSS `background` value: a horizontal gradient in the
// given rarity's colour, fading to transparent. Used for card
// borders/accent bars in detail sheets.
function rarBar(r){
  const c = RARITY_COLORS[r];
  return `background:linear-gradient(90deg,${c}cc,${c}33)`;
}
