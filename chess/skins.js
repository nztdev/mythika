/* ════════════════════════════════════════════════════════════════
   chess/skins.js — optional 3D character models for pieces
   ════════════════════════════════════════════════════════════════
   A character whose roster entry has a `model` (a .glb file) gets a 3D
   figure standing on a team-coloured pedestal. Everything else — no model,
   a model that fails to load, 3D switched off — keeps the portrait
   medallion, so a missing or broken model can never break the board.

   Flow: a piece is always built first with its medallion (instantly), then
   upgraded when the model arrives. Models are loaded once and shared.
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GLTFLoader } from '../lib/loaders/GLTFLoader.js';
import { RoomEnvironment } from '../lib/environments/RoomEnvironment.js';
import { CONFIG, TEAM_STYLES, SIDE_STYLE } from './config.js';
import { session } from './session.js';

// Height of the standing figure per role, measured up from the pedestal.
// Taller roles read as more important, like the plain pieces.
export const SKIN_HEIGHT = { pawn: 0.80, rook: 0.95, knight: 1.00, bishop: 1.15, queen: 1.40, king: 1.55 };
export const MAX_WIDTH = 0.86;         // a square is 1.0 wide: keep a gap between neighbours
export const PEDESTAL_HEIGHT = 0.07;
const PEDESTAL_RADIUS = 0.36;

/* ── Loading (once per file; failures are remembered and never thrown) ── */
async function defaultLoader(url){
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf.scene;
}
let loaderImpl = defaultLoader;
const cache = new Map();

// Tests (or a future custom loader) can replace how files are fetched.
export function setSkinLoader(fn){ loaderImpl = fn || defaultLoader; cache.clear(); }

export function loadModel(url){
  if (!cache.has(url)){
    cache.set(url, Promise.resolve().then(() => loaderImpl(url)).then(
      (obj) => obj || null,
      (err) => {
        console.warn(`3D model "${url}" could not be loaded; keeping the portrait medallion.`, err && err.message ? err.message : err);
        return null;
      }
    ));
  }
  return cache.get(url);
}

/* ── Reflections ──
   Models exported with metal maps (like most AI-generated ones) render
   near-black unless there is something to reflect. A small built-in "room"
   provides that. It is applied to the models' materials only, so the plain
   pieces keep exactly the look they already have. */
let envTexture = null, envTried = false;
export function setEnvironment(tex){ envTexture = tex; envTried = true; }
function environment(){
  if (!envTried){
    envTried = true;
    try {
      const pmrem = new THREE.PMREMGenerator(session.renderer);
      envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (err) {
      console.warn('Could not build the reflection environment:', err);
      envTexture = null;
    }
  }
  return envTexture;
}

/* ── Fitting a model onto the board ── */
export function prepareSkin(source, role, isPlayerSide){
  const model = source.clone(true);                    // shares geometry + materials with the cached original
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

  let k = SKIN_HEIGHT[role] / size.y;
  const widest = Math.max(size.x, size.z);
  if (widest * k > MAX_WIDTH) k = MAX_WIDTH / widest;  // wide capes/weapons must not spill into other squares

  // inner: scaled so the feet sit on the pedestal and the figure is centred on the square
  const inner = new THREE.Group();
  inner.add(model);
  inner.scale.setScalar(k);
  inner.position.set(
    -(box.min.x + box.max.x) / 2 * k,
    PEDESTAL_HEIGHT - box.min.y * k,
    -(box.min.z + box.max.z) / 2 * k
  );

  const env = environment();
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])){
      if (!m || !m.isMeshStandardMaterial) continue;
      if (env){ m.envMap = env; m.envMapIntensity = 1.0; }
      else if (m.metalness > 0.3) m.metalness = 0.3;   // nothing to reflect: tone metal down rather than render black
      m.needsUpdate = true;
    }
  });

  // The pedestal carries the team identity, since the model brings its own colours
  const style = TEAM_STYLES[isPlayerSide ? SIDE_STYLE.player : SIDE_STYLE.opponent];
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(PEDESTAL_RADIUS, PEDESTAL_RADIUS + 0.03, PEDESTAL_HEIGHT, 40),
    new THREE.MeshStandardMaterial({ color: style.body, roughness: style.roughness, metalness: style.metalness })
  );
  base.position.y = PEDESTAL_HEIGHT / 2;
  base.castShadow = true; base.receiveShadow = true;
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(PEDESTAL_RADIUS + 0.005, 0.014, 8, 40),
    new THREE.MeshStandardMaterial({ color: style.trim, roughness: 0.3, metalness: 0.8 })
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = PEDESTAL_HEIGHT;

  const skin = new THREE.Group();
  skin.add(base, trim, inner);
  skin.userData.isSkin = true;
  skin.userData.scale = k;
  return skin;
}

function disposeTree(obj){
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats){
      if (m.map) m.map.dispose();
      if (m.emissiveMap && m.emissiveMap !== m.map) m.emissiveMap.dispose();
      m.dispose();
    }
  });
}

// Replace the plain piece's visuals with the figure. The group itself (and
// its row/col bookkeeping) is untouched, so nothing else in the game notices.
export function swapToSkin(group, skin){
  for (const child of [...group.children]){ group.remove(child); disposeTree(child); }
  group.add(skin);
  group.userData.skinned = true;
}

export const skinsEnabled = () => CONFIG.skins3d !== false;

// Called when a player's piece is built. Safe to call for any piece: it does
// nothing unless the character has a model and 3D is on.
export function requestSkin(group, role, card){
  if (!card || !card.model || !skinsEnabled()) return;
  loadModel(card.model).then((source) => {
    if (!source) return;
    // The piece may have been removed (restart, capture) or replaced (promotion) while the file loaded
    if (!group.parent || group.userData.role !== role) return;
    swapToSkin(group, prepareSkin(source, role, group.userData.isPlayerSide));
  });
}
