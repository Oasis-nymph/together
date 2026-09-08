import type { Edge, Neuron, Settings } from './types';
import type { Rng } from './random';
import { ROUNDS } from './types';

/** 系统状态光谱：简单 → 有序 → 混沌边缘 → 混沌 → 无序（映射到波动强度 + 噪声） */
export const REGIMES: Record<string, { wave: number; noise: number }> = {
  simple: { wave: 1.0, noise: 0.0 },
  order: { wave: 1.0, noise: 0.05 },
  edge: { wave: 1.0, noise: 0.22 },
  chaos: { wave: 0.5, noise: 0.6 },
  disorder: { wave: 0.0, noise: 0.9 },
};

export function getRegimeParams(s: Pick<Settings, 'regime' | 'wave' | 'noise'>): { wave: number; noise: number } {
  return s.regime === 'custom' ? { wave: s.wave, noise: s.noise } : REGIMES[s.regime] ?? REGIMES.edge;
}

export interface Activity {
  activeEdges: string[][];
  activeNodes: string[][];
}

/**
 * 生成每一轮的"放电"：波动（有序传播）+ 噪声（随机放电）。
 * 返回每轮活跃的边 id 与节点 id。
 */
export function generateActivity(
  neurons: Neuron[],
  edges: Edge[],
  params: { wave: number; noise: number },
  rng: Rng,
  rounds: number = ROUNDS
): Activity {
  const activeEdges: string[][] = new Array(rounds);
  const activeNodes: string[][] = new Array(rounds);

  const pick = () => (neurons.length ? neurons[Math.floor(rng() * neurons.length)].id : '');
  const first = neurons.length ? neurons[0].id : '';
  let active = new Set<string>(first ? [first] : []);
  const visited = new Set<string>(active);

  for (let r = 0; r < rounds; r++) {
    const eSet = new Set<string>();
    const nSet = new Set<string>();

    // 1) 波动：有序传播（波强 < 1 时会被随机重启打断）
    if (params.wave > 0) {
      const next = new Set<string>();
      for (const n of active) {
        nSet.add(n);
        for (const e of edges) {
          if (e.source === n || e.target === n) {
            const m = e.source === n ? e.target : e.source;
            eSet.add(e.id);
            if (!visited.has(m)) next.add(m);
          }
        }
      }
      for (const m of next) {
        nSet.add(m);
        visited.add(m);
      }
      if (rng() > params.wave) active = new Set([pick()]);
      else if (next.size) active = next;
      else active = new Set([pick()]);
    }

    // 2) 噪声：随机放电
    const k = Math.round(params.noise * edges.length * 0.4);
    for (let i = 0; i < k; i++) {
      const e = edges[Math.floor(rng() * edges.length)];
      if (!e) continue;
      eSet.add(e.id);
      nSet.add(e.source);
      nSet.add(e.target);
    }

    activeEdges[r] = [...eSet];
    activeNodes[r] = [...nSet];
  }

  return { activeEdges, activeNodes };
}
