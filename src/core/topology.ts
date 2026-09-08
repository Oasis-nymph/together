import type { Rng } from './random';
import type { Vec3 } from './types';

/** 按拓扑生成神经元位置 */
export function genPositions(count: number, topology: string, rng: Rng): Vec3[] {
  const pts: Vec3[] = [];
  if (topology === 'ring') {
    const R = 6.5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push([Math.cos(a) * R, 0, Math.sin(a) * R]);
    }
  } else if (topology === 'star') {
    pts.push([0, 0, 0]);
    const R = 6.5;
    for (let i = 1; i < count; i++) {
      const a = ((i - 1) / Math.max(1, count - 1)) * Math.PI * 2;
      pts.push([Math.cos(a) * R, Math.sin(a) * 0.4, Math.sin(a) * R]);
    }
  } else if (topology === 'grid') {
    const side = Math.ceil(Math.sqrt(count));
    const sp = 1.6;
    for (let i = 0; i < count; i++) {
      const x = (i % side) - (side - 1) / 2;
      const z = Math.floor(i / side) - (side - 1) / 2;
      pts.push([x * sp, 0, z * sp]);
    }
  } else if (topology === 'smallworld') {
    const R = 6.5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push([Math.cos(a) * R, (rng() - 0.5) * 1.4, Math.sin(a) * R]);
    }
  } else {
    const centers: Vec3[] = [[-4, -1, 0], [2, 2, -1], [0, -2, 2], [3, -3, -2]];
    for (let i = 0; i < count; i++) {
      const c = centers[i % centers.length];
      pts.push([
        c[0] + (rng() - 0.5) * 3.4,
        c[1] + (rng() - 0.5) * 2.4,
        c[2] + (rng() - 0.5) * 2.4,
      ]);
    }
  }
  return pts;
}

export interface RawEdge {
  a: number;
  b: number;
}

/** 按拓扑生成边（联系） */
export function genEdges(count: number, topology: string, density: number, pos: Vec3[], rng: Rng): RawEdge[] {
  const es: RawEdge[] = [];
  const add = (a: number, b: number) => {
    if (a !== b && a >= 0 && b >= 0 && a < count && b < count) es.push({ a, b });
  };
  const dist = (i: number, j: number) => {
    const dx = pos[i][0] - pos[j][0];
    const dy = pos[i][1] - pos[j][1];
    const dz = pos[i][2] - pos[j][2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  if (topology === 'ring') {
    for (let i = 0; i < count; i++) add(i, (i + 1) % count);
  } else if (topology === 'star') {
    for (let i = 1; i < count; i++) add(0, i);
  } else if (topology === 'grid') {
    const side = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      if (i % side < side - 1 && i + 1 < count) add(i, i + 1);
      if (i + side < count) add(i, i + side);
    }
  } else if (topology === 'smallworld') {
    for (let i = 0; i < count; i++) {
      add(i, (i + 1) % count);
      add(i, (i + 2) % count);
    }
  } else if (topology === 'full') {
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) add(i, j);
  } else if (topology === 'random') {
    for (let i = 0; i < count * 2; i++) add(Math.floor(rng() * count), Math.floor(rng() * count));
  } else {
    // clusters：k 近邻
    for (let i = 0; i < count; i++) {
      const d: [number, number][] = [];
      for (let j = 0; j < count; j++) if (j !== i) d.push([j, dist(i, j)]);
      d.sort((x, y) => x[1] - y[1]);
      for (let k = 0; k < 3; k++) {
        const j = d[k][0];
        if (i < j) add(i, j);
      }
    }
  }

  // 密度：额外随机边
  const extra = Math.round(density * count * 1.2);
  for (let e = 0; e < extra; e++) add(Math.floor(rng() * count), Math.floor(rng() * count));
  return es;
}
