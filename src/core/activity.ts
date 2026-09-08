import type { Edge, Neuron, Settings } from './types';
import type { Rng } from './random';
import { ROUNDS } from './types';

/** 系统状态参数：波动/噪声作用于消息投递；温度偏移/长度上限作用于模型行为 */
export interface RegimeParams {
  wave: number;
  noise: number;
  tempDelta: number; // 温度偏移（混沌越高温）
  maxLen: number; // 单条消息最大长度（无序时强制简短）
}

/** 系统状态光谱：简单 → 有序 → 混沌边缘 → 混沌 → 无序 */
export const REGIMES: Record<string, RegimeParams> = {
  simple: { wave: 1.0, noise: 0.0, tempDelta: -0.15, maxLen: 500 },
  order: { wave: 1.0, noise: 0.05, tempDelta: -0.05, maxLen: 700 },
  edge: { wave: 1.0, noise: 0.22, tempDelta: 0.05, maxLen: 900 },
  chaos: { wave: 0.5, noise: 0.6, tempDelta: 0.25, maxLen: 500 },
  disorder: { wave: 0.0, noise: 0.9, tempDelta: 0.4, maxLen: 300 },
};

export function getRegimeParams(s: Pick<Settings, 'regime' | 'wave' | 'noise'>): RegimeParams {
  if (s.regime === 'custom') {
    return { wave: s.wave, noise: s.noise, tempDelta: 0.1 + s.noise * 0.4, maxLen: 800 };
  }
  return REGIMES[s.regime] ?? REGIMES.edge;
}

/** 环境权重：不同系统状态对涌现分的侧重点不同（有序看共识，混沌看新颖） */
export interface ScoreWeights {
  consensus: number;
  novelty: number;
  entropy: number;
  relDiv: number;
}

export const SCORE_WEIGHTS: Record<string, ScoreWeights> = {
  simple: { consensus: 0.45, novelty: 0.15, entropy: 0.25, relDiv: 0.15 },
  order: { consensus: 0.4, novelty: 0.2, entropy: 0.25, relDiv: 0.15 },
  edge: { consensus: 0.3, novelty: 0.3, entropy: 0.25, relDiv: 0.15 },
  chaos: { consensus: 0.2, novelty: 0.4, entropy: 0.25, relDiv: 0.15 },
  disorder: { consensus: 0.15, novelty: 0.45, entropy: 0.25, relDiv: 0.15 },
  custom: { consensus: 0.3, novelty: 0.3, entropy: 0.25, relDiv: 0.15 },
};

export function getScoreWeights(regime: string): ScoreWeights {
  return SCORE_WEIGHTS[regime] ?? SCORE_WEIGHTS.edge;
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
