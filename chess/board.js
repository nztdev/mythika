/* ════════════════════════════════════════════════════════════════
   chess/board.js — the board itself (plinth + 64 squares)
   ════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { CONFIG, N, S, squareToWorld } from './config.js';
import { session } from './session.js';

export function buildBoard(){
  const boardGroup = new THREE.Group();

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(N*S + 0.6, 0.35, N*S + 0.6),
    new THREE.MeshStandardMaterial({ color: 0x1a1628, roughness: 0.6, metalness: 0.2 })
  );
  plinth.position.y = -0.375;
  plinth.receiveShadow = true;
  boardGroup.add(plinth);

  for (let row = 0; row < N; row++){
    for (let col = 0; col < N; col++){
      // Standard colouring: a1 (row 0, col 0) is a DARK square
      const isLight = (row + col) % 2 === 1;
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(S, 0.15, S),
        new THREE.MeshStandardMaterial({
          color: isLight ? CONFIG.lightSquareColor : CONFIG.darkSquareColor,
          roughness: 0.5, metalness: 0.1,
        })
      );
      const p = squareToWorld(row, col);
      square.position.set(p.x, -0.075, p.z);
      square.receiveShadow = true;
      square.userData = { isBoardSquare: true, row, col };
      session.squareMeshes[row][col] = square;
      boardGroup.add(square);
    }
  }
  session.scene.add(boardGroup);
}