/* ════════════════════════════════════════════════════════════════
   MYTHIKA — SHARED ART RENDERER
   ════════════════════════════════════════════════════════════════
   Renders a character's portrait wherever it's needed — gacha
   cards, battle fighters, chess piece skins, memory-match tiles,
   trivia question images. Every game should render character art
   through Art.html(card, w, h) rather than building its own <img>
   tag, so the missing-image fallback behaves identically everywhere.

   DEPENDS ON: roster.js must be loaded first (for the ROSTER lookup
   used by showFallback).

   HOW THE FALLBACK WORKS
   ─────────────────────
   If art/<id>.jpg (or whatever `img` points to) is missing or
   fails to load, a generated SVG placeholder is shown instead,
   built from the character's `palette` and `element` fields. This
   means a new character can be added to roster.js immediately,
   with real artwork following later, and nothing ever breaks or
   shows a broken-image icon.
   ════════════════════════════════════════════════════════════════ */

const Art={
  // Set to a CDN base URL if hosting art remotely, e.g.
  // 'https://cdn.example.com/mythika/'. Leave '' for same-origin
  // relative paths (the default — art/ folder next to the HTML).
  BASE_URL: '',

  url(card){ return (this.BASE_URL||'') + (card.img||`art/${card.id}.jpg`); },

  // Returns a self-contained HTML snippet: an <img> that safely
  // falls back to a generated SVG on load failure. w/h accept any
  // CSS size value ('100%', '108px', etc.) or are omitted for 100%.
  html(card,w,h){
    const url=this.url(card);
    const uid='art-'+card.id+'-'+Math.random().toString(36).slice(2,7);
    const wrapStyle=`width:${w||'100%'};height:${h||'100%'};display:flex;align-items:center;justify-content:center;background:#06060f;position:relative;`;
    const imgStyle=`width:100%;height:100%;object-fit:contain;display:block;`;
    // A data attribute carries the card id; onerror calls a safe
    // global function rather than inlining fallback SVG as a string
    // (inlining broke on special characters — see project history).
    return `<div style="${wrapStyle}" id="${uid}"><img src="${url}" alt="${card.name}" loading="lazy" style="${imgStyle}" data-card-id="${card.id}" onerror="Art.showFallback(this)"></div>`;
  },

  showFallback(img){
    const card=ROSTER.find(c=>c.id===img.dataset.cardId);
    if(!card)return;
    const parent=img.parentElement;
    if(parent){ parent.innerHTML=this.fallback(card); }
  },

  fallback(card){
    const p=card.palette;
    const elE={Storm:'⚡',Arcane:'✦',Lightning:'⚡',Wind:'🌀',Solar:'☀',Water:'💧',Earth:'⛰',Fire:'🔥',Spirit:'👁',Divine:'✺'}[card.element]||'✦';
    const rc={1:'#9ba8b5',2:'#4cc9f0',3:'#c9a84c',4:'#c77dff',5:'#ff6b6b'}[card.rarity];
    const sid=card.id.replace(/[^a-z0-9]/g,'');
    return`<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="bg${sid}" cx="50%" cy="38%" r="72%"><stop offset="0%" stop-color="${p[0]}" stop-opacity=".28"/><stop offset="100%" stop-color="#06060f"/></radialGradient>
<radialGradient id="gl${sid}" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="${p[0]}" stop-opacity=".5"/><stop offset="100%" stop-color="${p[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="bd${sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${p[0]}" stop-opacity=".82"/><stop offset="100%" stop-color="${p[2]||p[1]}" stop-opacity=".55"/></linearGradient>
</defs>
<rect width="240" height="300" fill="url(#bg${sid})"/>
<circle cx="120" cy="115" r="92" fill="none" stroke="${p[0]}" stroke-opacity=".1" stroke-width=".8"/>
<circle cx="120" cy="115" r="70" fill="none" stroke="${p[0]}" stroke-opacity=".14" stroke-width=".5" stroke-dasharray="8 5"/>
<ellipse cx="120" cy="118" rx="40" ry="52" fill="url(#bd${sid})"/>
<ellipse cx="120" cy="82" rx="25" ry="29" fill="${p[0]}" fill-opacity=".72"/>
<ellipse cx="109" cy="79" rx="6.5" ry="4.5" fill="${p[2]||'#fff'}" fill-opacity=".92"/>
<ellipse cx="131" cy="79" rx="6.5" ry="4.5" fill="${p[2]||'#fff'}" fill-opacity=".92"/>
<ellipse cx="110" cy="79" rx="3.8" ry="3.8" fill="${p[1]||'#111'}"/>
<ellipse cx="132" cy="79" rx="3.8" ry="3.8" fill="${p[1]||'#111'}"/>
<circle cx="111" cy="77.5" r="1.4" fill="white" fill-opacity=".9"/>
<circle cx="133" cy="77.5" r="1.4" fill="white" fill-opacity=".9"/>
<circle cx="120" cy="118" r="60" fill="url(#gl${sid})" opacity=".5"/>
<text x="120" y="192" text-anchor="middle" font-size="30" opacity=".5">${elE}</text>
<rect x="40" y="228" width="160" height="1.5" fill="${rc}" fill-opacity=".3" rx="1"/>
<text x="120" y="248" text-anchor="middle" font-size="8.5" fill="${rc}" opacity=".7" font-family="serif">${'★'.repeat(card.rarity)}${'☆'.repeat(5-card.rarity)}</text>
<text x="120" y="264" text-anchor="middle" font-size="6.5" fill="${p[0]}" opacity=".4" font-family="Cinzel,serif" letter-spacing="3">${(card.element||'').toUpperCase()}</text>
</svg>`;
  }
};
