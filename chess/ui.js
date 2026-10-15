/* ════════════════════════════════════════════════════════════════
   chess/ui.js — everything that touches the page's HTML overlays
   ════════════════════════════════════════════════════════════════
   The rest of the code never calls document.getElementById directly for
   UI; it goes through here. That keeps the HTML ids in one file, so
   restyling or adding a screen (menu, intro) doesn't ripple elsewhere.
   ════════════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

// How much of the screen the top bar/turn pill and bottom banner cover,
// in pixels — measured live so it follows text wrapping on small phones.
export function measureUiBars(){
  const H = window.innerHeight;
  const pill = $('turn-indicator').getBoundingClientRect();
  const banner = $('note-banner').getBoundingClientRect();
  let topPx = pill.bottom, bottomPx = H - banner.top;
  if (!(topPx > 0 && topPx < H * 0.5)) topPx = 92;       // fallback if layout isn't measurable yet
  if (!(bottomPx > 0 && bottomPx < H * 0.5)) bottomPx = 64;
  return { topPx, bottomPx };
}

export function updateTurnIndicator(turn, status, over){
  const el = $('turn-indicator');
  el.className = '';
  if (over){
    el.textContent = over.title;
    el.classList.add(status === 'checkmate' ? 'in-check' : 'opp-turn');
    return;
  }
  const mine = turn === 'player';
  const label = mine ? 'Your move' : "Shadow's move";
  if (status === 'check'){
    el.textContent = 'Check! — ' + label;
    el.classList.add('in-check');
  } else {
    el.textContent = label;
    el.classList.add(mine ? 'your-turn' : 'opp-turn');
  }
}

export function showGameOver(over){
  $('go-icon').textContent = over.icon;
  $('go-title').textContent = over.title;
  $('go-sub').textContent = over.sub;
  $('gameover-overlay').classList.add('show');
}
export function hideGameOver(){ $('gameover-overlay').classList.remove('show'); }

export function openPromotionOverlay(){ $('promo-overlay').classList.add('show'); }
export function closePromotionOverlay(){ $('promo-overlay').classList.remove('show'); }

// Handlers are passed in (not imported) so ui.js stays at the bottom of the
// dependency graph and never has to know about input or game logic.
export function bindPromotionHandlers({ onChoose, onCancel }){
  document.querySelectorAll('.promo-choice').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); onChoose(btn.dataset.type); });
  });
  const overlay = $('promo-overlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) onCancel(); });
}

export function hideLoadingOverlay(){ $('loading-overlay').classList.add('hide'); }

export function showBootError(message){
  hideLoadingOverlay();
  $('error-overlay').classList.add('show');
  $('error-detail').textContent = message;
}