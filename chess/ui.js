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

/* ── Intro, menu and mode chrome ── */
export function showIntro(){ $('intro-overlay').classList.add('show'); }
export function hideIntro(){ $('intro-overlay').classList.remove('show'); }
export function showMenu(){ $('menu-overlay').classList.add('show'); }
export function hideMenu(){ $('menu-overlay').classList.remove('show'); }

export function setMenuNotice(text){
  const el = $('menu-notice');
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}
export function setStartBusy(busy){
  const b = $('menu-start');
  b.disabled = !!busy;
  b.textContent = busy ? 'Summoning the Shadow…' : 'Begin';
}

// The menu's segmented choices live in the HTML as buttons marked .on
export function readMenuChoices(){
  const out = { opponent: 'ai', difficulty: 'adept', side: 'first' };
  document.querySelectorAll('.seg-group').forEach(g => {
    const on = g.querySelector('.seg.on');
    if (on) out[g.dataset.group] = on.dataset.value;
  });
  return out;
}
function refreshMenuVisibility(){
  // Difficulty and who-moves-first only matter against the computer
  $('menu-ai-options').style.display = readMenuChoices().opponent === 'pass' ? 'none' : 'block';
}
export function setMenuChoices(choices){
  document.querySelectorAll('.seg-group').forEach(g => {
    const want = choices[g.dataset.group];
    if (!want) return;
    g.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b.dataset.value === want));
  });
  refreshMenuVisibility();
}

export function bindMenuHandlers({ onIntroTap, onStart, onMenuButton }){
  $('intro-overlay').addEventListener('click', onIntroTap);
  $('menu-start').addEventListener('click', onStart);
  $('menu-btn').addEventListener('click', onMenuButton);
  document.querySelectorAll('.seg').forEach(btn => btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b === btn));
    refreshMenuVisibility();
  }));
}

export function setBanner(html){ $('note-banner').innerHTML = html; }
export function setMenuButtonVisible(visible){ $('menu-btn').style.display = visible ? 'block' : 'none'; }
// Leaving mid-game needs a second tap, so a stray touch can't lose a game
export function setMenuButtonArmed(armed){
  const b = $('menu-btn');
  b.textContent = armed ? 'Leave game?' : '☰ Menu';
  b.classList.toggle('armed', armed);
}
export function setStatus(text, cls){
  const el = $('turn-indicator');
  el.className = cls || '';
  el.textContent = text;
}
export function setThinking(){ setStatus('Shadow is thinking…', 'opp-turn'); }