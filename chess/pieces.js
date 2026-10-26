/* ════════════════════════════════════════════════════════════════
   chess/pieces.js — building one 3D piece
   ════════════════════════════════════════════════════════════════
   A piece is a lathe-turned body (the same technique real wooden sets
   are made with) carrying a round portrait medallion. Nothing here knows
   about rules or turns — it only builds meshes.
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { CONFIG, TEAM_STYLES, SIDE_STYLE, squareToWorld } from './config.js';
import { session } from './session.js';

/* Each profile is an array of [radius, height] points revolved around the
   Y axis. Proportions differ per role so the silhouette alone hints at
   piece type before the medallion is read. */
export const PROFILES = {
  pawn: [
    [0.30,0.00],[0.32,0.04],[0.22,0.10],[0.16,0.28],[0.20,0.34],
    [0.14,0.46],[0.20,0.58],[0.24,0.60],[0.24,0.66],[0.00,0.70],
  ],
  rook: [
    [0.32,0.00],[0.34,0.04],[0.24,0.10],[0.22,0.55],[0.30,0.62],
    [0.30,0.72],[0.24,0.76],[0.24,0.80],[0.00,0.80],
  ],
  bishop: [
    [0.30,0.00],[0.32,0.04],[0.20,0.12],[0.15,0.40],[0.20,0.60],
    [0.12,0.78],[0.16,0.92],[0.10,0.98],[0.13,1.04],[0.00,1.10],
  ],
  knight: [
    [0.31,0.00],[0.33,0.04],[0.23,0.12],[0.19,0.30],[0.26,0.50],
    [0.30,0.62],[0.22,0.74],[0.24,0.84],[0.00,0.90],
  ],
  queen: [
    [0.34,0.00],[0.36,0.04],[0.22,0.14],[0.17,0.50],[0.24,0.74],
    [0.16,0.98],[0.20,1.14],[0.10,1.26],[0.14,1.32],[0.00,1.40],
  ],
  king: [
    [0.36,0.00],[0.38,0.04],[0.24,0.14],[0.18,0.54],[0.25,0.80],
    [0.17,1.06],[0.22,1.24],[0.24,1.40],[0.18,1.46],[0.00,1.50],
  ],
};

/* ── SMOOTHING ──
   The hand-placed control points above are deliberately few (easy to read
   and tweak), but joined by straight lines they give a faceted silhouette.
   Chaikin corner-cutting rounds them: each pass replaces every corner with
   two points a quarter of the way along its neighbouring edges. Unlike a
   spline it can never overshoot — radii stay between 0 and the widest
   control point, heights never double back, and the base and tip are kept
   exactly, so piece heights are unchanged. */
function chaikin(points, passes){
  let pts = points;
  for (let i = 0; i < passes; i++){
    const out = [pts[0]];
    for (let j = 0; j < pts.length - 1; j++){
      const [x0, y0] = pts[j], [x1, y1] = pts[j + 1];
      out.push([0.75*x0 + 0.25*x1, 0.75*y0 + 0.25*y1],
               [0.25*x0 + 0.75*x1, 0.25*y0 + 0.75*y1]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
const _smoothCache = {};
export function smoothedProfile(role){
  return (_smoothCache[role] ||= chaikin(PROFILES[role], 2));
}
const LATHE_SEGMENTS = 40;   // around the piece — round, not faceted, when seen from above

// Body radius of a role's profile at a given height (linear interpolation).
// Used to seat the medallion ON the piece's surface rather than inside it.
export function profileRadiusAt(role, y){
  const pts = smoothedProfile(role);
  for (let i = 0; i < pts.length - 1; i++){
    const [r0, y0] = pts[i], [r1, y1] = pts[i+1];
    if (y >= y0 && y <= y1){
      const span = y1 - y0;
      if (span < 1e-6) return Math.max(r0, r1);
      return r0 + (r1 - r0) * ((y - y0) / span);
    }
  }
  return 0.2;
}

function makeLatheMesh(role, material){
  const pts = smoothedProfile(role).map(([r,y]) => new THREE.Vector2(r,y));
  // LatheGeometry computes accurate smooth normals itself; recomputing them
  // by face-averaging (as this used to) replaced them with a cruder result.
  const geo = new THREE.LatheGeometry(pts, LATHE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Crossed-box topper unique to the King, so its silhouette is unmistakable.
function makeKingCross(material){
  const group = new THREE.Group();
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), material);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), material);
  bar1.position.y = 1.58;
  bar2.position.y = 1.58;
  bar1.castShadow = bar2.castShadow = true;
  group.add(bar1, bar2);
  return group;
}

export const MEDALLION_HEIGHT = {
  pawn: 0.36, rook: 0.40, bishop: 0.52, knight: 0.42, queen: 0.66, king: 0.72,
};
const MEDALLION_RADIUS = 0.125;
const BOSS_RADIUS = 0.15;

// Crop a portrait to a centred-top square so a tall card image isn't
// squashed into the round medallion (faces sit in the upper part).
function fitPortraitToDisc(tex){
  const img = tex.image;
  const w = img && (img.naturalWidth || img.width);
  const h = img && (img.naturalHeight || img.height);
  if (!w || !h) return;
  if (h > w){ const k = w / h; tex.repeat.set(1, k); tex.offset.set(0, (1 - k) * 0.85); }
  else if (w > h){ const k = h / w; tex.repeat.set(k, 1); tex.offset.set((1 - k) / 2, 0); }
}

let _loader = null;
const textureLoader = () => (_loader ||= new THREE.TextureLoader());

// A round portrait medallion on the piece's chest: a short stud (the
// "boss") bridges the curved body to a flat portrait disc, so it reads as
// a crest pinned to the piece rather than a floating plate. `card` is a
// ROSTER character for the player's pieces, or null for the Shadow side
// (which gets one uniform sigil).
function makeMedallion(card, role, isPlayerSide){
  const mountY = MEDALLION_HEIGHT[role];
  const bodyR = profileRadiusAt(role, mountY);
  const zFront = bodyR + 0.025;
  const zBack  = bodyR - 0.08;     // tucked inside the body

  const accent = isPlayerSide ? CONFIG.playerAccent : CONFIG.shadowAccent;
  const bossGeo = new THREE.CylinderGeometry(BOSS_RADIUS, BOSS_RADIUS, zFront - zBack, 24);
  bossGeo.rotateX(Math.PI / 2);    // axis along +z so its flat face points at the viewer
  const boss = new THREE.Mesh(bossGeo, new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 0.8 }));
  boss.position.set(0, mountY, (zFront + zBack) / 2);
  boss.castShadow = true;

  let map, material;
  if (card){
    map = makeFallbackMedallionTexture(card);
    material = new THREE.MeshStandardMaterial({
      map, emissive: new THREE.Color(0xffffff), emissiveMap: map, emissiveIntensity: 0.4,
      roughness: 0.45, metalness: 0.1,
    });
    // Swap in the real portrait once it loads; the colour fallback is what
    // shows meanwhile, or permanently if the art file is missing.
    textureLoader().load(
      Art.url(card),
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        fitPortraitToDisc(tex);
        material.map = tex;
        material.emissiveMap = tex;
        material.needsUpdate = true;
      },
      undefined,
      () => { /* keep the fallback — a missing image never breaks a piece */ }
    );
  } else {
    map = makeShadowMedallionTexture();
    material = new THREE.MeshStandardMaterial({
      map, emissive: new THREE.Color(0x8b7cf6), emissiveMap: map, emissiveIntensity: 0.5,
      roughness: 0.5, metalness: 0.2,
    });
  }

  const disc = new THREE.Mesh(new THREE.CircleGeometry(MEDALLION_RADIUS, 28), material);
  disc.position.set(0, mountY, zFront + 0.002);

  const group = new THREE.Group();
  group.add(boss, disc);
  return group;
}

// Element symbols — the same ones the Dex draws for characters without art
// (kept in step with Art.fallback in shared/art.js).
const ELEMENT_GLYPH = {
  Storm:'⚡', Arcane:'✦', Lightning:'⚡', Wind:'🌀', Solar:'☀',
  Water:'💧', Earth:'⛰', Fire:'🔥', Spirit:'👁', Divine:'✺',
};

// Shown before a portrait loads, or permanently if the art file is missing.
// A bare colour disc looks broken, so this carries the character's element
// symbol on their own palette colour, ringed in their accent colour.
function makeFallbackMedallionTexture(card){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const base = card.palette?.[0] || '#c9a84c';
  const ring = card.palette?.[2] || card.palette?.[1] || '#f0ecdf';
  ctx.fillStyle = '#06060f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ring; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(64, 64, 55, 0, Math.PI * 2); ctx.stroke();
  ctx.font = '60px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ELEMENT_GLYPH[card.element] || '✦', 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One uniform sigil for every Shadow piece — deliberately identical,
// reinforcing that the opposing side is faceless.
let _shadowTexCache = null;
function makeShadowMedallionTexture(){
  if (_shadowTexCache) return _shadowTexCache;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0,0,128,128);
  ctx.strokeStyle = 'rgba(139,124,246,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64,64,40,0,Math.PI*2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(139,124,246,0.6)';
  ctx.beginPath();
  ctx.arc(64,64,10,0,Math.PI*2);
  ctx.fill();
  _shadowTexCache = new THREE.CanvasTexture(c);
  _shadowTexCache.colorSpace = THREE.SRGBColorSpace;
  return _shadowTexCache;
}

// One complete piece: lathe body + (king) cross + portrait medallion. The
// group remembers who it is, so a promotion can rebuild it as a new role
// while keeping the same character's portrait.
export function buildPiece(role, isPlayerSide, card){
  const group = new THREE.Group();
  const style = TEAM_STYLES[isPlayerSide ? SIDE_STYLE.player : SIDE_STYLE.opponent];

  const body = makeLatheMesh(role, new THREE.MeshStandardMaterial({
    color: style.body, roughness: style.roughness, metalness: style.metalness,
  }));
  group.add(body);

  if (role === 'king'){
    group.add(makeKingCross(new THREE.MeshStandardMaterial({ color: style.trim, roughness: 0.3, metalness: 0.8 })));
  }

  group.add(makeMedallion(isPlayerSide ? card : null, role, isPlayerSide));
  group.userData = { isPiece: true, role, isPlayerSide, card: card || null, row: -1, col: -1 };
  return group;
}

// Build a piece, put it on a square, and register it in the lookup grid.
export function placePiece(role, isPlayerSide, card, row, col){
  const piece = buildPiece(role, isPlayerSide, card);
  const p = squareToWorld(row, col);
  piece.position.set(p.x, 0, p.z);
  piece.userData.row = row;
  piece.userData.col = col;
  session.pieceMeshes[row][col] = piece;
  session.scene.add(piece);
  return piece;
}
