import { genEdges, genPositions } from './topology';
import type { Rng } from './random';
import type { EmergenceMetrics } from './emergence';
import type { Edge, Message, Neuron } from './types';
import type { ScenarioTemplate } from './scenarios';

/** 场景变体：一个可运行的"世界" */
export interface ScenarioVariant {
  id: string;
  name: string;
  description: string;
  neurons: Neuron[];
  edges: Edge[];
  task: string;
  regime: string;
  topology: string;
  density: number;
}

export interface ScenarioResult {
  variant: ScenarioVariant;
  metrics: EmergenceMetrics;
  messages: Message[];
  summary: string;
}

const REGIME_POOL = ['order', 'edge', 'chaos', 'simple'];
const STYLE_POOL = ['', '（保持简洁）', '（尽量详细）', '（立场更鲜明）'];
const TOPO_POOL = ['clusters', 'smallworld', 'star', 'grid'];

/** 穷举场景空间：角色轮转 × 状态光谱 × 拓扑 × 风格 的变异组合 */
export function generateVariants(tpl: ScenarioTemplate, count: number, rng: Rng): ScenarioVariant[] {
  const variants: ScenarioVariant[] = [];
  for (let i = 0; i < count; i++) {
    const topology = i === 0 ? tpl.topology : TOPO_POOL[i % TOPO_POOL.length];
    const regime = i === 0 ? tpl.regime : REGIME_POOL[i % REGIME_POOL.length];
    const density = Math.min(0.6, tpl.density + (i % 3) * 0.08);
    const style = STYLE_POOL[i % STYLE_POOL.length];
    const rotate = i % Math.max(1, tpl.roles.length);

    const pos = genPositions(tpl.count, topology, rng);
    const raw = genEdges(tpl.count, topology, density, pos, rng);
    const neurons: Neuron[] = pos.map((p, k) => {
      const ri = (k + rotate) % tpl.roles.length;
      return {
        id: `sv-${i}-n-${k}`,
        name: `${tpl.roles[ri]} ${k + 1}`,
        role: tpl.roles[ri],
        systemPrompt: tpl.prompts[ri] + (style ? ` ${style}` : ''),
        pos: p,
        radius: 0.24 + rng() * 0.14,
      };
    });
    const edges: Edge[] = raw.map((e) => ({
      id: `sv-${i}-e-${e.a}-${e.b}`,
      source: neurons[e.a].id,
      target: neurons[e.b].id,
      relationType: tpl.relationType,
      direction: 'both',
      weight: 0.5,
    }));
    variants.push({
      id: `sv-${i}`,
      name: `${tpl.name} · 变体 ${i + 1}`,
      description: `拓扑=${topology} · 状态=${regime} · 角色偏移${rotate}${style}`,
      neurons,
      edges,
      task: tpl.task,
      regime,
      topology,
      density,
    });
  }
  return variants;
}
