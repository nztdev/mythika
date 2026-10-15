/* ════════════════════════════════════════════════════════════════
   chess/scene.js — renderer, camera, lights, and the render loop
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls } from '../lib/OrbitControls.js';
import { N, S } from './config.js';
import { session } from './session.js';
import { measureUiBars } from './ui.js';

/* ── CAMERA FRAMING ──
   A fixed camera cannot work across screen shapes: on a portrait phone a
   board that fits a desktop window is over twice as wide as the screen.
   So the distance is SOLVED, not guessed: we binary-search the closest
   camera distance at which the board's real projected corners (plus the
   tops of tall back-rank pieces) land inside the free area between the
   top bar and the bottom banner. Solving from the actual projection
   accounts for perspective (near corners look bigger than the centre) and
   for whatever orbit angle the player left the camera at.
   The default elevation is steep (52°) on purpose: from a shallow angle a
   tall piece (the king, 1.6 high) hides the pawn directly behind it and
   makes that pawn untappable. */
const CAMERA_ELEVATION = 52 * Math.PI / 180;

function usableBand(){
  const H = window.innerHeight;
  const { topPx, bottomPx } = measureUiBars();
  const pad = 10;
  return { xMax: 0.95, yMax: 1 - 2 * (topPx + pad) / H, yMin: -1 + 2 * (bottomPx + pad) / H };
}

export function fitCameraToBoard(keepDirection){
  const { camera, controls, scene } = session;
  const dir = keepDirection
    ? camera.position.clone().sub(controls.target).normalize()
    : new THREE.Vector3(0, Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_ELEVATION));
  const band = usableBand();
  const half = (N * S) / 2 + 0.3;                       // board edge + a little plinth

  const probes = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) probes.push(new THREE.Vector3(sx * half, 0, sz * half));
  for (const sx of [-1, 1]) probes.push(new THREE.Vector3(sx * half, 1.7, -half)); // tall far-rank pieces

  const v = new THREE.Vector3();
  const fits = (d) => {
    camera.position.copy(controls.target).addScaledVector(dir, d);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);
    for (const p of probes){
      v.copy(p).project(camera);
      if (Math.abs(v.x) > band.xMax || v.y > band.yMax || v.y < band.yMin) return false;
    }
    return true;
  };

  let lo = 6, hi = 70;
  if (fits(hi)){
    for (let i = 0; i < 24; i++){ const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  }
  const dist = Math.max(hi, 9);                          // never closer than 9: keeps perspective gentle
  camera.position.copy(controls.target).addScaledVector(dir, dist);

  controls.maxDistance = Math.max(16, dist * 1.5);
  scene.fog.near = dist + 6;                             // keep the fog behind the board
  scene.fog.far  = dist + 24;
  controls.update();
}

function setupLighting(scene){
  scene.add(new THREE.AmbientLight(0x4a4470, 0.55));

  // Warm key light, matching the app's gold-glow aesthetic
  const key = new THREE.DirectionalLight(0xfff0c8, 1.3);
  key.position.set(5, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  scene.add(key);

  // Cool rim light from the opposite side for depth
  const rim = new THREE.DirectionalLight(0x8888ff, 0.4);
  rim.position.set(-6, 4, -6);
  scene.add(rim);
}

export function initScene(){
  const container = document.getElementById('scene-container');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080810);
  scene.fog = new THREE.Fog(0x080810, 12, 26);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 120);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.3, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.48; // never dip below the board

  Object.assign(session, { scene, camera, renderer, controls, raycaster: new THREE.Raycaster() });
  fitCameraToBoard(false);
  setupLighting(scene);
}

export function onResize(){
  const { camera, renderer } = session;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCameraToBoard(true);   // re-frame (e.g. phone rotated)
}

// onFrame(now) lets the caller run per-frame work (animations, marker pulse)
// without scene.js needing to know about them.
export function startRenderLoop(onFrame){
  function frame(){
    requestAnimationFrame(frame);
    onFrame(performance.now());
    session.controls.update();
    session.renderer.render(session.scene, session.camera);
  }
  frame();
}