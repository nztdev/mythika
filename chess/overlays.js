/* ════════════════════════════════════════════════════════════════
   chess/overlays.js — selection ring, legal-move markers, check ring
   ════════════════════════════════════════════════════════════════
   The glowing things drawn ON the board (not the pieces themselves).
   Geometry and materials are created once and reused for every selection.
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { squareToWorld } from './config.js';
import { session } from './session.js';

const QUIET_GEO   = new THREE.CircleGeometry(0.14, 24).rotateX(-Math.PI/2);
const CAPTURE_GEO = new THREE.RingGeometry(0.34, 0.45, 32).rotateX(-Math.PI/2);
const SELECT_GEO  = new THREE.RingGeometry(0.36, 0.47, 32).rotateX(-Math.PI/2);
const CHECK_GEO   = new THREE.RingGeometry(0.40, 0.52, 32).rotateX(-Math.PI/2);
const QUIET_MAT   = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85, depthWrite: false });
const CAPTURE_MAT = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.9,  depthWrite: false });
const SELECT_MAT  = new THREE.MeshBasicMaterial({ color: 0xe8c96a, transparent: true, opacity: 0.95, depthWrite: false });
const CHECK_MAT   = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.95, depthWrite: false });

export function createOverlays(){
  session.selectionRing = new THREE.Mesh(SELECT_GEO, SELECT_MAT);
  session.selectionRing.visible = false;
  session.scene.add(session.selectionRing);

  session.checkRing = new THREE.Mesh(CHECK_GEO, CHECK_MAT);
  session.checkRing.visible = false;
  session.scene.add(session.checkRing);
}

export function showSelectionRing(row, col){
  const p = squareToWorld(row, col);
  session.selectionRing.position.set(p.x, 0.012, p.z);
  session.selectionRing.visible = true;
}
export function hideSelectionRing(){
  if (session.selectionRing) session.selectionRing.visible = false;
}

export function addMarker(row, col, isCapture){
  const marker = new THREE.Mesh(isCapture ? CAPTURE_GEO : QUIET_GEO, isCapture ? CAPTURE_MAT : QUIET_MAT);
  const p = squareToWorld(row, col);
  marker.position.set(p.x, 0.02, p.z);
  session.scene.add(marker);
  session.highlights.push(marker);
}
export function clearMarkers(){
  for (const m of session.highlights) session.scene.remove(m);
  session.highlights = [];
}

export function showCheckRing(row, col){
  const p = squareToWorld(row, col);
  session.checkRing.position.set(p.x, 0.016, p.z);
  session.checkRing.visible = true;
}
export function hideCheckRing(){
  if (session.checkRing) session.checkRing.visible = false;
}

// Gentle pulse so legal-move markers read as tappable
export function pulseMarkers(now){
  const pulse = 1 + 0.12 * Math.sin(now / 180);
  for (const m of session.highlights) m.scale.set(pulse, 1, pulse);
}