import * as THREE from 'three';

/** 白色径向渐变柔光贴图（用材质 color 染色，白底不发糊） */
export function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export const GREEN = new THREE.Color('#22c55e');
export const NODE_IDLE = new THREE.Color('#1fa85a');
export const NODE_ON = new THREE.Color('#a7f3d0');
export const EDGE_IDLE = new THREE.Color('#c3ccd8');
export const EDGE_ON = new THREE.Color('#86efac');
