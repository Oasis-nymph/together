import { speakAll, type InboxItem } from './scheduler';
import type { Memory } from './memory';
import type { ApiConfig, Edge, Message, Neuron } from './types';

export interface RunOptions {
  neurons: Neuron[];
  edges: Edge[];
  task: string;
  api: ApiConfig;
  rounds: number;
  signal: AbortSignal;
  memories?: Memory[];
  onMessage: (m: Message) => void;
  onRoundDone?: (roundMsgs: Message[], round: number) => void;
}

/**
 * 通用运行器（画布与场景穷举共用）：
 * 第 0 轮把总任务注入所有神经元；此后每轮把上一轮消息沿语义方向投递。
 * 平台只收集 + 标注元信息，取舍交给模型。
 */
export async function runSimulation(opts: RunOptions): Promise<Message[]> {
  const { neurons, edges, task, api, rounds, signal, memories = [], onMessage, onRoundDone } = opts;
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

    pending = await speakAll(neurons, edges, inbox, task, api, r, signal, (m) => {
      all.push(m);
      onMessage(m);
    }, memories);

    if (onRoundDone) onRoundDone(pending, r);
    if (!pending.length) break; // 全体沉默，提前结束
  }

  return all;
}
