import { speakAll, type InboxItem } from './scheduler';
import type { Memory } from './memory';
import type { ApiConfig, Edge, Message, Neuron } from './types';

export interface RunOptions {
  neurons: Neuron[];
  edges: Edge[];
  task: string;
  getApi: (neuronId: string) => ApiConfig; // 每个神经元可指定不同模型
  rounds: number;
  signal: AbortSignal;
  memories?: Memory[];
  onMessage: (m: Message) => void;
  onRoundDone?: (roundMsgs: Message[], round: number) => void;
  concurrency?: number; // 同时说话的神经元数（1~8）
  /** 系统状态：wave/noise 作用于消息投递；tempDelta/maxLen 作用于模型行为。缺省 = 原行为 */
  regime?: { wave: number; noise: number; tempDelta?: number; maxLen?: number };
}

/**
 * 通用运行器（画布与场景穷举共用）：
 * 第 0 轮把总任务注入所有神经元；此后每轮把上一轮消息沿语义方向投递。
 * 平台只收集 + 标注元信息，取舍交给模型。
 */
export async function runSimulation(opts: RunOptions): Promise<Message[]> {
  const { neurons, edges, task, getApi, rounds, signal, memories = [], onMessage, onRoundDone } = opts;
  const concurrency = opts.concurrency ?? 2;
  const regime = opts.regime ?? { wave: 1, noise: 0, tempDelta: 0, maxLen: 900 };
  const behavior = { temperatureDelta: regime.tempDelta ?? 0, maxLen: regime.maxLen ?? 900 };
  const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;
  const all: Message[] = [];
  let pending: Message[] = [];

  for (let r = 0; r < rounds; r++) {
    if (signal.aborted) break;
    const inbox = new Map<string, InboxItem[]>();
    const add = (id: string, item: InboxItem) => {
      if (!inbox.has(id)) inbox.set(id, []);
      inbox.get(id)!.push(item);
    };

    if (r === 0) {
      for (const n of neurons) {
        add(n.id, { fromId: 'user', fromName: '总任务', relationType: '任务', weight: 1, content: task });
      }
    } else {
      for (const m of pending) {
        add(m.toId, {
          fromId: m.fromId,
          fromName: nameOf(m.fromId),
          relationType: m.relationType,
          weight: m.weight ?? 1,
          content: m.content,
        });
      }
    }

    pending = await speakAll(neurons, edges, inbox, task, getApi, r, signal, (m) => {
      all.push(m);
      onMessage(m);
    }, memories, concurrency, behavior);

    // 系统状态作用于投递层
    if (regime.wave < 1 || regime.noise > 0) {
      const delivered: Message[] = [];
      for (const m of pending) {
        if (Math.random() < regime.wave) delivered.push(m);
        if (regime.noise > 0 && Math.random() < regime.noise) {
          const others = neurons.filter((x) => x.id !== m.toId && x.id !== m.fromId);
          if (others.length) {
            delivered.push({
              ...m,
              id: `${m.id}-n`,
              toId: others[Math.floor(Math.random() * others.length)].id,
            });
          }
        }
      }
      pending = delivered;
    }

    if (onRoundDone) onRoundDone(pending, r);
    if (!pending.length) break; // 全体沉默，提前结束
  }

  return all;
}
