import type { Message } from './types';

/** 涌现指标：全部由对话记录计算，观察的是"全局量"（不是任何单个神经元规定的） */
export interface EmergenceMetrics {
  participation: number; // 0-1 发言神经元占比
  messageCount: number;
  speakerCount: number;
  totalNeurons: number;
  consensus: number; // 0-1 消息两两相似度均值（字符二元组 Jaccard）
  novelty: number; // 0-1 相邻消息不相似度（内容新鲜度）
  roleEntropy: number; // 0-1 发言分布归一化熵（越均匀越高；分工/寡头可见）
  relationDiversity: number; // 0-1 关系类型多样性
  score: number; // 综合涌现分 0-100
}

/** 字符二元组集合（对中文友好，无需分词） */
function bigrams(s: string): Set<string> {
  const clean = s.replace(/[\s\p{P}\p{S}]/gu, '');
  const set = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function entropy01(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return 0;
  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }
  const maxH = Math.log2(counts.length || 1);
  return maxH ? h / maxH : 0;
}

export function computeMetrics(messages: Message[], neuronCount: number): EmergenceMetrics {
  const real = messages.filter((m) => m.real && m.relationType !== '错误' && m.content);
  const contents = real.map((m) => m.content);
  const speakers = new Set(real.map((m) => m.fromId));
  const relTypes = new Set(real.map((m) => m.relationType));

  // 样本上限 40 条，避免 O(n²) 爆炸
  const sample =
    contents.length > 40 ? [...contents].sort(() => Math.random() - 0.5).slice(0, 40) : contents;
  const sets = sample.map(bigrams);

  let simSum = 0;
  let simN = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      simSum += jaccard(sets[i], sets[j]);
      simN++;
    }
  }
  const consensus = simN ? simSum / simN : 0;

  let novelSum = 0;
  let novelN = 0;
  for (let i = 1; i < sets.length; i++) {
    novelSum += 1 - jaccard(sets[i], sets[i - 1]);
    novelN++;
  }
  const novelty = novelN ? novelSum / novelN : 0;

  const counts = new Map<string, number>();
  for (const m of real) counts.set(m.fromId, (counts.get(m.fromId) ?? 0) + 1);
  const roleEntropy = entropy01([...counts.values()]);

  const participation = neuronCount ? Math.min(1, speakers.size / neuronCount) : 0;
  const relationDiversity = Math.min(1, relTypes.size / 6);

  const score = Math.round(
    100 * participation * (0.35 * consensus + 0.25 * novelty + 0.25 * roleEntropy + 0.15 * relationDiversity)
  );

  return {
    participation,
    messageCount: real.length,
    speakerCount: speakers.size,
    totalNeurons: neuronCount,
    consensus,
    novelty,
    roleEntropy,
    relationDiversity,
    score,
  };
}

export function interpret(metrics: EmergenceMetrics): string {
  if (!metrics.messageCount) return '尚无对话，运行一轮后再观察。';
  const parts: string[] = [];
  if (metrics.participation >= 0.6) parts.push('参与广泛');
  else if (metrics.participation > 0) parts.push('少数神经元主导（可能的自发分工）');
  if (metrics.consensus >= 0.4) parts.push('观点趋于一致');
  else if (metrics.consensus > 0) parts.push('观点保持多元');
  if (metrics.novelty >= 0.5) parts.push('内容持续产生新意');
  if (metrics.roleEntropy >= 0.7) parts.push('发言分布均匀');
  if (metrics.score >= 60) parts.push('——综合涌现迹象明显');
  else if (metrics.score >= 30) parts.push('——涌现迹象中等');
  else parts.push('——涌现迹象较弱');
  return parts.join(' · ');
}
