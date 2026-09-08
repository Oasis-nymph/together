import { chat } from './llm';
import { buildMemoryContext } from './memory';
import type { Memory } from './memory';
import type { ApiConfig, Edge, Message, Neuron } from './types';

export interface InboxItem {
  fromId: string;
  fromName: string;
  relationType: string;
  weight: number;
  content: string;
}

/** 该节点沿某条边的语义出口（考虑方向） */
function edgeDeliveries(e: Edge, speakerId: string): { toId: string }[] {
  const both = e.direction === 'both';
  const out: { toId: string }[] = [];
  if (e.source === speakerId && (both || e.direction === 'forward')) out.push({ toId: e.target });
  if (e.target === speakerId && (both || e.direction === 'backward')) out.push({ toId: e.source });
  return out;
}

/**
 * 平台唯一职责：把收件箱里每条消息标注元信息（来自谁 / 关系 / 权重），
 * 打包进一次 LLM 调用；如何取舍、加权、合并，完全由模型自己判断。
 */
function buildPrompt(
  n: Neuron,
  task: string,
  items: InboxItem[],
  memories: Memory[],
  maxLen: number
): { system: string; user: string } {
  const persona = n.systemPrompt.trim()
    ? n.systemPrompt
    : `你是「${n.name}」${n.role.trim() ? `，身份：${n.role}` : ''}。`;
  const system =
    persona +
    '\n\n【平台规则】你收到的每条信息都附有平台标注的元信息（来自谁、什么关系、权重多少）。' +
    '如何取舍、加权、合并完全由你自己判断，平台不做任何聚合。' +
    '你的回复会被记录进记忆库、可能被分享，请把重要事实与结论写清楚。回复请直接、简洁。';
  const list = items
    .map((i) => `- [来自: ${i.fromName}｜关系: ${i.relationType}｜权重: ${i.weight}] ${i.content.slice(0, maxLen)}`)
    .join('\n');
  const memCtx = buildMemoryContext(memories, n.id, 6);
  const user =
    `总任务：${task}\n\n` +
    (memCtx ? `你的记忆（平台按归属范围提供，仅你能读到的部分）：\n${memCtx}\n\n` : '') +
    `你本轮收到的信息：\n${list}\n\n请综合判断后给出你的回复。`;
  return { system, user };
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

let seq = 0;

export interface SpeakBehavior {
  temperatureDelta: number; // 系统状态对温度的偏移（混沌越高温）
  maxLen: number; // 单条消息截断长度
}

/** 一轮放电：有收信的神经元各自调一次模型（各自指定的模型），把回复广播给语义方向上的邻居 */
export async function speakAll(
  neurons: Neuron[],
  edges: Edge[],
  inboxMap: Map<string, InboxItem[]>,
  task: string,
  getApi: (neuronId: string) => ApiConfig,
  round: number,
  signal: AbortSignal,
  onMessage: (m: Message) => void,
  memories: Memory[] = [],
  concurrency = 2,
  behavior: SpeakBehavior = { temperatureDelta: 0, maxLen: 900 }
): Promise<Message[]> {
  const speakers = neurons.filter((n) => (inboxMap.get(n.id)?.length ?? 0) > 0);
  const produced: Message[] = [];
  const stamp = Date.now();

  await mapLimit(speakers, concurrency, async (n) => {
    const items = inboxMap.get(n.id)!;
    const { system, user } = buildPrompt(n, task, items, memories, behavior.maxLen);
    const api = { ...getApi(n.id) };
    api.temperature = Math.min(2, Math.max(0, api.temperature + behavior.temperatureDelta));

    let content: string;
    try {
      content = (
        await chat({
          provider: api.provider,
          baseURL: api.baseURL,
          apiKey: api.apiKey,
          model: api.model,
          temperature: api.temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          signal,
        })
      ).trim();
    } catch (e) {
      const err: Message = {
        id: `${stamp}-${round}-err-${++seq}`,
        round,
        fromId: n.id,
        toId: '',
        relationType: '错误',
        content: `调用失败：${e instanceof Error ? e.message : String(e)}`,
        real: true,
      };
      produced.push(err);
      onMessage(err);
      return;
    }

    // 广播给语义出口
    for (const e of edges) {
      const targets = edgeDeliveries(e, n.id);
      for (const t of targets) {
        const m: Message = {
          id: `${stamp}-${round}-${++seq}`,
          round,
          fromId: n.id,
          toId: t.toId,
          relationType: e.relationType,
          weight: e.weight,
          content,
          real: true,
        };
        produced.push(m);
        onMessage(m);
      }
    }
  });

  return produced;
}
