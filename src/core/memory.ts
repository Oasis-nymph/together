/**
 * 多层级发散记忆库（核心模型）
 * - 归属范围读写：A 的个人记忆只有 A 能读；A+B 的共同记忆 A、B 都能读（未来扩展：群组/全局）。
 * - 类型：事件记忆（平台自动记录）、推论记忆（由该单位的模型生成）。
 * - 衰减：每条记忆带半衰期，不强化就随时间淡出。
 */

export type MemoryLevel = 'personal' | 'shared'; // 未来: 'group' | 'global'
export type MemoryType = 'event' | 'inference';

export interface Memory {
  id: string;
  ownerId: string; // 记忆归属单位：个人 = 神经元 id；共同 = 成员 id 排序后拼接
  level: MemoryLevel;
  scope: string[]; // 可读的神经元 id 列表（归属范围）
  type: MemoryType;
  content: string;
  createdAt: number;
  strength: number; // 初始 1
  halfLifeMs: number; // 半衰期（毫秒）
}

/** 衰减后的当前强度：strength * 0.5^(t/halfLife) */
export function decayedStrength(m: Memory, now: number = Date.now()): number {
  return m.strength * Math.pow(0.5, Math.max(0, now - m.createdAt) / m.halfLifeMs);
}

/** 按归属范围取某个神经元可读的记忆，按当前强度排序 */
export function readableMemories(memories: Memory[], neuronId: string, now: number = Date.now()): Memory[] {
  return memories
    .filter((m) => m.scope.includes(neuronId))
    .sort((a, b) => decayedStrength(b, now) - decayedStrength(a, now));
}

/** 生成给模型的记忆上下文（只有该神经元有权读到的部分） */
export function buildMemoryContext(memories: Memory[], neuronId: string, limit = 6, now = Date.now()): string {
  const list = readableMemories(memories, neuronId, now).slice(0, limit);
  if (!list.length) return '';
  return list
    .map(
      (m) =>
        `- [${m.level === 'shared' ? '共同' : '个人'}记忆｜${m.type === 'inference' ? '推论' : '事件'}｜强度${decayedStrength(m, now).toFixed(2)}] ${m.content}`
    )
    .join('\n');
}

/** 记忆总量控制：按当前强度保留最强的 N 条 */
export function pruneMemories(memories: Memory[], cap = 800, now = Date.now()): Memory[] {
  if (memories.length <= cap) return memories;
  return memories.sort((a, b) => decayedStrength(b, now) - decayedStrength(a, now)).slice(0, cap);
}

export const EVENT_HALF_LIFE = 7 * 24 * 3600 * 1000; // 事件：7 天半衰期
export const INFERENCE_HALF_LIFE = 14 * 24 * 3600 * 1000; // 推论：14 天半衰期
