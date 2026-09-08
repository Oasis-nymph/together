import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genEdges, genPositions } from '../core/topology';
import { generateActivity, getRegimeParams } from '../core/activity';
import { speakAll, type InboxItem } from '../core/scheduler';
import { chat, checkProxy } from '../core/llm';
import {
  EVENT_HALF_LIFE,
  INFERENCE_HALF_LIFE,
  pruneMemories,
  readableMemories,
  type Memory,
} from '../core/memory';
import { makeRng } from '../core/random';
import { OPENAI_DEFAULT_URL, ROUNDS } from '../core/types';
import type { ApiConfig, Edge, Message, Neuron, Settings, Vec3 } from '../core/types';

let counter = 0;
const uid = (p: string) => `${p}-${++counter}-${Math.floor(Math.random() * 1e6)}`;

const DEFAULT_SETTINGS: Settings = {
  topology: 'clusters',
  count: 14,
  density: 0.25,
  regime: 'edge',
  wave: 0.5,
  noise: 0.3,
  seed: 20260721,
};

const DEFAULT_API: ApiConfig = {
  provider: 'openai',
  baseURL: OPENAI_DEFAULT_URL,
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
};

/** 语义方向 → 实际收发双方 */
function directedEnds(e: Edge): { fromId: string; toId: string } {
  if (e.direction === 'backward') return { fromId: e.target, toId: e.source };
  return { fromId: e.source, toId: e.target };
}

interface TogetherState {
  settings: Settings;
  neurons: Neuron[];
  edges: Edge[];
  activeEdgesByRound: string[][];
  activeNodesByRound: string[][];
  messagesByRound: Message[][];
  round: number;
  playing: boolean;
  dragging: boolean;
  selectedNeuronId: string | null;
  selectedEdgeId: string | null;
  connectMode: boolean;
  connectFromId: string | null;

  // 真实 AI 运行
  api: ApiConfig;
  task: string;
  runRounds: number;
  running: boolean;
  runRound: number;
  runMessages: Message[];
  runError: string;
  runController: AbortController | null;

  // 多层级发散记忆库
  memories: Memory[];
  distilling: string | null;

  setSettings: (patch: Partial<Settings>) => void;
  rebuild: () => void;
  recomputeActivity: () => void;
  addNeuron: (pos: Vec3) => string;
  updateNeuron: (id: string, patch: Partial<Omit<Neuron, 'id'>>) => void;
  removeNeuron: (id: string) => void;
  addEdge: (a: string, b: string) => void;
  updateEdge: (id: string, patch: Partial<Omit<Edge, 'id'>>) => void;
  removeEdge: (id: string) => void;
  selectNeuron: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  deselectAll: () => void;
  setConnectMode: (on: boolean) => void;
  setConnectFromId: (id: string | null) => void;
  setDragging: (on: boolean) => void;
  setRound: (r: number) => void;
  setPlaying: (on: boolean) => void;

  setApi: (patch: Partial<ApiConfig>) => void;
  setTask: (t: string) => void;
  setRunRounds: (n: number) => void;
  startRun: () => void;
  stopRun: () => void;
  addEventMemories: (msgs: Message[]) => void;
  distillMemory: (neuronId: string) => Promise<void>;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
}

export const useStore = create<TogetherState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      neurons: [],
      edges: [],
      activeEdgesByRound: [],
      activeNodesByRound: [],
      messagesByRound: [],
      round: 0,
      playing: true,
      dragging: false,
      selectedNeuronId: null,
      selectedEdgeId: null,
      connectMode: false,
      connectFromId: null,

      api: { ...DEFAULT_API },
      task: '讨论：合作是如何在自利个体之间产生的？请最终给出一个共同结论。',
      runRounds: 6,
      running: false,
      runRound: 0,
      runMessages: [],
      runError: '',
      runController: null,

      memories: [],
      distilling: null,

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      rebuild: () => {
        const { settings } = get();
        const rng = makeRng(settings.seed);
        const pos = genPositions(settings.count, settings.topology, rng);
        const raw = genEdges(settings.count, settings.topology, settings.density, pos, rng);
        const neurons: Neuron[] = pos.map((p, i) => ({
          id: uid('n'),
          name: `神经元 ${i + 1}`,
          role: '',
          systemPrompt: '',
          pos: p,
          radius: 0.24 + rng() * 0.14,
        }));
        const edges: Edge[] = raw.map((e) => ({
          id: uid('e'),
          source: neurons[e.a].id,
          target: neurons[e.b].id,
          relationType: '指令',
          direction: 'both',
          weight: 0.5,
        }));
        set({
          neurons,
          edges,
          round: 0,
          selectedNeuronId: null,
          selectedEdgeId: null,
          connectFromId: null,
        });
        get().recomputeActivity();
      },

      recomputeActivity: () => {
        const { neurons, edges, settings } = get();
        const params = getRegimeParams(settings);
        const act = generateActivity(neurons, edges, params, makeRng(settings.seed));
        const messagesByRound: Message[][] = act.activeEdges.map((ids, r) =>
          ids
            .map((eid) => {
              const e = edges.find((x) => x.id === eid);
              if (!e) return null;
              const { fromId, toId } = directedEnds(e);
              const fromN = neurons.find((n) => n.id === fromId);
              const toN = neurons.find((n) => n.id === toId);
              if (!fromN || !toN) return null;
              return {
                id: uid('m'),
                round: r,
                fromId,
                toId,
                relationType: e.relationType,
                content: `${fromN.name} 向 ${toN.name} 发出「${e.relationType}」信号（模拟）`,
              } as Message;
            })
            .filter((m): m is Message => m !== null)
        );
        set({
          activeEdgesByRound: act.activeEdges,
          activeNodesByRound: act.activeNodes,
          messagesByRound,
        });
      },

      addNeuron: (pos) => {
        const id = uid('n');
        const neuron: Neuron = {
          id,
          name: `神经元 ${get().neurons.length + 1}`,
          role: '',
          systemPrompt: '',
          pos,
          radius: 0.28,
        };
        set((s) => ({ neurons: [...s.neurons, neuron], selectedNeuronId: id, selectedEdgeId: null }));
        get().recomputeActivity();
        return id;
      },

      updateNeuron: (id, patch) => {
        const before = get().neurons.find((n) => n.id === id);
        set((s) => ({ neurons: s.neurons.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
        if (patch.name !== undefined && before?.name !== patch.name) get().recomputeActivity();
      },

      removeNeuron: (id) => {
        set((s) => ({
          neurons: s.neurons.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNeuronId: s.selectedNeuronId === id ? null : s.selectedNeuronId,
          selectedEdgeId: null,
        }));
        get().recomputeActivity();
      },

      addEdge: (a, b) => {
        const { edges } = get();
        const existing = edges.find(
          (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
        );
        if (existing) {
          set({ selectedEdgeId: existing.id, selectedNeuronId: null });
          return;
        }
        const edge: Edge = {
          id: uid('e'),
          source: a,
          target: b,
          relationType: '指令',
          direction: 'both',
          weight: 0.5,
        };
        set((s) => ({ edges: [...s.edges, edge], selectedEdgeId: edge.id, selectedNeuronId: null }));
        get().recomputeActivity();
      },

      updateEdge: (id, patch) => {
        set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
        get().recomputeActivity();
      },

      removeEdge: (id) => {
        set((s) => ({ edges: s.edges.filter((e) => e.id !== id), selectedEdgeId: null }));
        get().recomputeActivity();
      },

      selectNeuron: (id) => set({ selectedNeuronId: id, selectedEdgeId: null }),
      selectEdge: (id) => set({ selectedEdgeId: id, selectedNeuronId: null }),
      deselectAll: () => set({ selectedNeuronId: null, selectedEdgeId: null }),
      setConnectMode: (on) => set({ connectMode: on, connectFromId: null }),
      setConnectFromId: (id) => set({ connectFromId: id }),
      setDragging: (on) => set({ dragging: on }),
      setRound: (r) => set({ round: ((r % ROUNDS) + ROUNDS) % ROUNDS }),
      setPlaying: (on) => set({ playing: on }),

      setApi: (patch) => set((s) => ({ api: { ...s.api, ...patch } })),
      setTask: (t) => set({ task: t }),
      setRunRounds: (n) => set({ runRounds: n }),

      startRun: async () => {
        const { neurons, edges, api, task, runRounds } = get();
        if (!api.model.trim()) {
          set({ runError: '请先在「模型设置」里填写模型名' });
          return;
        }
        if (api.provider === 'openai' && !api.apiKey.trim()) {
          set({ runError: '请先在「模型设置」里填写 API Key（Ollama 不需要）' });
          return;
        }
        const proxyOk = await checkProxy();
        if (!proxyOk) {
          set({
            runError:
              '连不上本地代理(:8787)。请本地运行 npm run dev；GitHub Pages 静态版只支持可视化演示，不支持真实对话。',
          });
          return;
        }
        const controller = new AbortController();
        set({ running: true, runError: '', runMessages: [], runRound: 0, runController: controller });

        const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;

        try {
          let pending: Message[] = [];
          for (let r = 0; r < runRounds; r++) {
            if (controller.signal.aborted) break;
            const { neurons: ns, edges: es, memories } = get();
            const inbox = new Map<string, InboxItem[]>();
            const add = (id: string, item: InboxItem) => {
              if (!inbox.has(id)) inbox.set(id, []);
              inbox.get(id)!.push(item);
            };
            if (r === 0) {
              for (const n of ns) {
                add(n.id, {
                  fromId: 'user',
                  fromName: '总任务',
                  relationType: '任务',
                  weight: 1,
                  content: task,
                });
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
            set({ runRound: r + 1 });
            pending = await speakAll(
              ns,
              es,
              inbox,
              task,
              api,
              r,
              controller.signal,
              (m) => set((s) => ({ runMessages: [...s.runMessages, m] })),
              memories
            );
            if (pending.length) get().addEventMemories(pending); // 事件自动写入记忆库
            if (!pending.length) break; // 全体沉默，提前结束
          }
        } catch (e) {
          set({ runError: e instanceof Error ? e.message : String(e) });
        } finally {
          set({ running: false });
        }
      },

      stopRun: () => {
        get().runController?.abort();
        set({ running: false });
      },

      addEventMemories: (msgs) => {
        if (!msgs.length) return;
        const { neurons, memories } = get();
        const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;
        const now = Date.now();
        const news: Memory[] = [];
        for (const m of msgs) {
          if (!m.toId || m.relationType === '错误') continue;
          const text = m.content.length > 160 ? m.content.slice(0, 160) + '…' : m.content;
          // 个人记忆：只有说话者自己能读
          news.push({
            id: uid('mem'),
            ownerId: m.fromId,
            level: 'personal',
            scope: [m.fromId],
            type: 'event',
            content: `第 ${m.round + 1} 轮对「${nameOf(m.toId)}」说（${m.relationType}）：${text}`,
            createdAt: now,
            strength: 1,
            halfLifeMs: EVENT_HALF_LIFE,
          });
          // 共同记忆：双方都可读
          news.push({
            id: uid('mem'),
            ownerId: [m.fromId, m.toId].sort().join('|'),
            level: 'shared',
            scope: [m.fromId, m.toId],
            type: 'event',
            content: `${nameOf(m.fromId)} 与 ${nameOf(m.toId)} 的对话（${m.relationType}）：${text}`,
            createdAt: now,
            strength: 1,
            halfLifeMs: EVENT_HALF_LIFE,
          });
        }
        set((s) => ({ memories: pruneMemories([...memories, ...news]) }));
      },

      distillMemory: async (neuronId) => {
        const { neurons, memories, api, task, runMessages } = get();
        const n = neurons.find((x) => x.id === neuronId);
        if (!n) return;
        if (!api.model.trim()) {
          set({ runError: '请先在「模型设置」里填写模型名' });
          return;
        }
        set({ distilling: neuronId, runError: '' });
        try {
          // 平台把该神经元有权读到的记忆 + 近期经历交给模型，推论记忆由模型生成
          const readable = readableMemories(memories, neuronId).slice(0, 12);
          const mine = runMessages
            .filter((m) => m.fromId === neuronId || m.toId === neuronId)
            .slice(-12);
          const persona = n.systemPrompt.trim() || `你是「${n.name}」。`;
          const system =
            persona +
            '\n\n【平台规则】请回顾你的经历，提炼最多 3 条你认为最重要、值得记住的结论/印象/约定。' +
            '每条一行，直接写内容，不要编号。';
          const user =
            `总任务：${task}\n\n你的经历：\n` +
            readable.map((m) => `- [记忆] ${m.content}`).join('\n') +
            '\n' +
            mine.map((m) => `- [第${m.round + 1}轮] ${m.content.slice(0, 120)}`).join('\n');
          const content = await chat({
            provider: api.provider,
            baseURL: api.baseURL,
            apiKey: api.apiKey,
            model: api.model,
            temperature: 0.5,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          });
          const lines = content
            .split('\n')
            .map((l) => l.replace(/^[\d\-\*\s\.、]+/, '').trim())
            .filter((l) => l.length >= 6)
            .slice(0, 3);
          const now = Date.now();
          const news: Memory[] = lines.map((l) => ({
            id: uid('mem'),
            ownerId: neuronId,
            level: 'personal',
            scope: [neuronId],
            type: 'inference',
            content: l,
            createdAt: now,
            strength: 1,
            halfLifeMs: INFERENCE_HALF_LIFE,
          }));
          set((s) => ({ memories: pruneMemories([...s.memories, ...news]) }));
        } catch (e) {
          set({ runError: `整理记忆失败：${e instanceof Error ? e.message : String(e)}` });
        } finally {
          set({ distilling: null });
        }
      },

      removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      clearMemories: () => set({ memories: [] }),
    }),
    {
      name: 'together-v1',
      partialize: (s) => ({ api: s.api, task: s.task, runRounds: s.runRounds, memories: s.memories }),
    }
  )
);
