import type { Message } from './types';
import type { ScoreWeights } from './activity';

/** 涌现指标：全部由对话记录计算，观察的是"全局量"（不是任何单个神经元规定的） */
export interface EmergenceMetrics {
  participation: number; // 0-1 发言神经元占比
  messageCount: number;
  speakerCount: number;
  totalNeurons: number;
  consensus: number; // 0-1 消息两两相似度均值（字符二元组 Jaccard，关系加权）
  novelty: number; // 0-1 相邻消息不相似度（内容新鲜度）
  roleEntropy: number; // 0-1 发言分布归一化熵（越均匀越高；分工/寡头可见）
  relationDiversity: number; // 0-1 关系类型多样性
  score: number; // 综合涌现分 0-100（按环境权重加权）
  judgeConsensus?: number; // 0-1 裁判模型评估的结论一致性（若已评测）
  taskQuality?: number; // 0-1 裁判模型评估的任务完成度（若已评测）
}

/** 关系类型权重：批判/投票/总结等强关系在共识与新颖计算中占更大比重 */
export const RELATION_FACTORS: Record<string, number> = {
  指令: 1,
  批判: 1.2,
  总结: 1.3,
  投票: 1.5,
  竞争: 1.1,
  自定义: 1,
  任务: 1,
};

const DEFAULT_WEIGHTS: ScoreWeights = { consensus: 0.3, novelty: 0.3, entropy: 0.25, relDiv: 0.15 };

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

const relFactor = (m: Message) => RELATION_FACTORS[m.relationType] ?? 1;

export function computeMetrics(
  messages: Message[],
  neuronCount: number,
  opts?: { weights?: ScoreWeights; judge?: { consensus?: number; quality?: number } }
): EmergenceMetrics {
  const weights = opts?.weights ?? DEFAULT_WEIGHTS;
  const real = messages.filter((m) => m.real && m.relationType !== '错误' && m.content);
  const speakers = new Set(real.map((m) => m.fromId));
  const relTypes = new Set(real.map((m) => m.relationType));

  // 样本上限 40 条，避免 O(n²) 爆炸
  const sample =
    real.length > 40 ? [...real].sort(() => Math.random() - 0.5).slice(0, 40) : real;
  const sets = sample.map((m) => bigrams(m.content));

  // 关系加权共识：强关系（批判/投票/总结）之间的相似更"算数"
  let simSum = 0;
  let simW = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const w = relFactor(sample[i]) * relFactor(sample[j]);
      simSum += jaccard(sets[i], sets[j]) * w;
      simW += w;
    }
  }
  const consensus = simW ? simSum / simW : 0;

  let novelSum = 0;
  let novelW = 0;
  for (let i = 1; i < sets.length; i++) {
    const w = (relFactor(sample[i]) + relFactor(sample[i - 1])) / 2;
    novelSum += (1 - jaccard(sets[i], sets[i - 1])) * w;
    novelW += w;
  }
  const novelty = novelW ? novelSum / novelW : 0;

  const counts = new Map<string, number>();
  for (const m of real) counts.set(m.fromId, (counts.get(m.fromId) ?? 0) + 1);
  const roleEntropy = entropy01([...counts.values()]);

  const participation = neuronCount ? Math.min(1, speakers.size / neuronCount) : 0;
  const relationDiversity = Math.min(1, relTypes.size / 6);

  // 裁判模型结果优先；否则用近似值
  const finalConsensus = opts?.judge?.consensus ?? consensus;

  const score = Math.round(
    100 *
      participation *
      (weights.consensus * finalConsensus +
        weights.novelty * novelty +
        weights.entropy * roleEntropy +
        weights.relDiv * relationDiversity)
  );

  return {
    participation,
    messageCount: real.length,
    speakerCount: speakers.size,
    totalNeurons: neuronCount,
    consensus: finalConsensus,
    novelty,
    roleEntropy,
    relationDiversity,
    score,
    judgeConsensus: opts?.judge?.consensus,
    taskQuality: opts?.judge?.quality,
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
  if (metrics.taskQuality !== undefined) parts.push(`任务完成度 ${(metrics.taskQuality * 100).toFixed(0)}%`);
  if (metrics.score >= 60) parts.push('——综合涌现迹象明显');
  else if (metrics.score >= 30) parts.push('——涌现迹象中等');
  else parts.push('——涌现迹象较弱');
  return parts.join(' · ');
}
