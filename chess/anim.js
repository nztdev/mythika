/* ════════════════════════════════════════════════════════════════
   chess/anim.js — piece movement tweens
   ════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';

const activeTweens = [];

// list: [{ obj, to:{x,z}, lift }]. onAllDone fires once every tween finishes
// (castling moves two pieces and must wait for both).
export function startTweens(list, onAllDone){
  let remaining = list.length;
  const now = performance.now();
  for (const t of list){
    activeTweens.push({
      obj: t.obj,
      fromX: t.obj.position.x, fromZ: t.obj.position.z,
      toX: t.to.x, toZ: t.to.z,
      lift: t.lift, start: now, duration: CONFIG.moveDurationMs,
      onDone: () => { remaining--; if (remaining === 0) onAllDone(); },
    });
  }
}

export function updateAnimations(now){
  for (let i = activeTweens.length - 1; i >= 0; i--){
    const tw = activeTweens[i];
    const t = Math.max(0, Math.min(1, (now - tw.start) / tw.duration));
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; // ease in-out
    tw.obj.position.x = tw.fromX + (tw.toX - tw.fromX) * e;
    tw.obj.position.z = tw.fromZ + (tw.toZ - tw.fromZ) * e;
    tw.obj.position.y = Math.sin(Math.PI * t) * tw.lift;       // a small hop
    if (t >= 1){
      tw.obj.position.y = 0;
      activeTweens.splice(i, 1);
      tw.onDone();
    }
  }
}

export function clearTweens(){ activeTweens.length = 0; }