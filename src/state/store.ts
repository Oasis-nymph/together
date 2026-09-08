import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genEdges, genPositions } from '../core/topology';
import { generateActivity, getRegimeParams } from '../core/activity';
import { runSimulation } from '../core/runner';
import { computeMetrics } from '../core/emergence';
import { chat, checkProxy } from '../core/llm';
import {
  EVENT_HALF_LIFE,
  INFERENCE_HALF_LIFE,
  groupScope,
  pruneMemories,
  readableMemories,
  type Memory,
} from '../core/memory';
import { makeRng } from '../core/random';
import { SCENARIO_TEMPLATES } from '../core/scenarios';
import { generateVariants, type ScenarioResult } from '../core/search';
import { makeProjectFile, parseProjectFile } from '../core/io';
import { OPENAI_DEFAULT_URL, ROUNDS } from '../core/types';
import type {
  ApiConfig,
  Edge,
  Group,
  Message,
  ModelProfile,
  Neuron,
  RunRecord,
  Settings,
  Vec3,
} from '../core/types';

const GROUP_COLORS = ['#4d8dff', '#8b5cf6', '#f59e0b', '#14b8a6', '#f43f5e', '#a3e635'];

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
  modelProfiles: ModelProfile[];
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

  // 嵌套群组
  groups: Group[];

  // 新人进入体验
  onboardingId: string | null;

  // 运行历史与涌现观察
  runs: RunRecord[];
  selectedRunId: string | null;

  // 涌现场景穷举
  searchRunning: boolean;
  searchProgress: { current: number; total: number } | null;
  searchResults: ScenarioResult[];
  searchError: string;
  searchController: AbortController | null;

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
  addModelProfile: (p: Omit<ModelProfile, 'id'>) => string;
  updateModelProfile: (id: string, patch: Partial<ModelProfile>) => void;
  removeModelProfile: (id: string) => void;
  setNeuronModel: (neuronId: string, modelId: string | null) => void;
  resolveApi: (neuronId: string) => ApiConfig;
  setTask: (t: string) => void;
  setRunRounds: (n: number) => void;
  startRun: () => void;
  stopRun: () => void;
  addEventMemories: (msgs: Message[]) => void;
  distillMemory: (neuronId: string) => Promise<void>;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
  selectRun: (id: string | null) => void;
  clearRuns: () => void;
  loadTemplate: (id: string) => void;
  startSearch: (opts: { templateId: string; variants: number; rounds: number }) => Promise<void>;
  stopSearch: () => void;
  loadScenarioResult: (r: ScenarioResult) => void;
  viewScenarioResult: (r: ScenarioResult) => void;

  addGroup: (name: string, parentId: string | null) => string;
  renameGroup: (id: string, name: string) => void;
  setGroupParent: (id: string, parentId: string | null) => void;
  removeGroup: (id: string) => void;
  setMembership: (neuronId: string, groupId: string | null) => void;
  promoteMemory: (memoryId: string, groupId: string) => void;

  onboardNeuron: (neuronId: string) => Promise<void>;
  duplicateNeuron: (id: string) => string | null;
  exportProject: () => void;
  importProject: (data: unknown) => boolean;
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
      modelProfiles: [],
      task: '讨论：合作是如何在自利个体之间产生的？请最终给出一个共同结论。',
      runRounds: 6,
      running: false,
      runRound: 0,
      runMessages: [],
      runError: '',
      runController: null,

      memories: [],
      distilling: null,

      groups: [],

      onboardingId: null,

      runs: [],
      selectedRunId: null,

      searchRunning: false,
      searchProgress: null,
      searchResults: [],
      searchError: '',
      searchController: null,

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
        void get().onboardNeuron(id); // 新人进入体验：认识环境、自我介绍、记录印象
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

      addModelProfile: (p) => {
        const id = uid('mp');
        set((s) => ({ modelProfiles: [...s.modelProfiles, { ...p, id }] }));
        return id;
      },
      updateModelProfile: (id, patch) =>
        set((s) => ({
          modelProfiles: s.modelProfiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removeModelProfile: (id) =>
        set((s) => ({
          modelProfiles: s.modelProfiles.filter((p) => p.id !== id),
          neurons: s.neurons.map((n) => (n.modelId === id ? { ...n, modelId: null } : n)),
        })),
      setNeuronModel: (neuronId, modelId) =>
        set((s) => ({
          neurons: s.neurons.map((n) => (n.id === neuronId ? { ...n, modelId } : n)),
        })),
      resolveApi: (neuronId) => {
        const { api, modelProfiles, neurons } = get();
        const n = neurons.find((x) => x.id === neuronId);
        const p = n?.modelId ? modelProfiles.find((x) => x.id === n.modelId) : null;
        if (!p) return api;
        return {
          provider: p.provider,
          baseURL: p.baseURL,
          apiKey: p.apiKey,
          model: p.model,
          temperature: api.temperature, // 温度沿用全局
        };
      },
      setTask: (t) => set({ task: t }),
      setRunRounds: (n) => set({ runRounds: n }),

      startRun: async () => {
        const { neurons, edges, api, task, runRounds, modelProfiles } = get();
        if (!api.model.trim() && modelProfiles.length === 0) {
          set({ runError: '请先在「模型设置」里配置全局模型，或在模型库中添加模型' });
          return;
        }
        if (api.provider === 'openai' && !api.apiKey.trim() && modelProfiles.length === 0) {
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

        try {
          await runSimulation({
            neurons,
            edges,
            task,
            getApi: (id) => get().resolveApi(id),
            rounds: runRounds,
            signal: controller.signal,
            memories: get().memories,
            onMessage: (m) =>
              set((s) => ({ runMessages: [...s.runMessages, m], runRound: m.round + 1 })),
            onRoundDone: (msgs) => {
              if (msgs.length) get().addEventMemories(msgs); // 事件自动写入记忆库
            },
          });
          const msgs = get().runMessages;
          if (msgs.length) {
            const metrics = computeMetrics(msgs, neurons.length);
            const rec: RunRecord = {
              id: uid('run'),
              at: Date.now(),
              task,
              rounds: runRounds,
              messages: msgs,
              metrics,
            };
            set((s) => ({ runs: [rec, ...s.runs].slice(0, 5), selectedRunId: rec.id }));
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
        const { neurons, memories, task, runMessages } = get();
        const n = neurons.find((x) => x.id === neuronId);
        if (!n) return;
        const resolved = get().resolveApi(neuronId);
        if (!resolved.model.trim()) {
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
            provider: resolved.provider,
            baseURL: resolved.baseURL,
            apiKey: resolved.apiKey,
            model: resolved.model,
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
      selectRun: (id) => set({ selectedRunId: id }),
      clearRuns: () => set({ runs: [], selectedRunId: null }),

      loadTemplate: (id) => {
        const tpl = SCENARIO_TEMPLATES.find((t) => t.id === id);
        if (!tpl) return;
        const rng = makeRng(Math.floor(Math.random() * 1e9));
        const pos = genPositions(tpl.count, tpl.topology, rng);
        const raw = genEdges(tpl.count, tpl.topology, tpl.density, pos, rng);
        const neurons: Neuron[] = pos.map((p, i) => ({
          id: uid('n'),
          name: `${tpl.roles[i % tpl.roles.length]} ${i + 1}`,
          role: tpl.roles[i % tpl.roles.length],
          systemPrompt: tpl.prompts[i % tpl.prompts.length],
          pos: p,
          radius: 0.24 + rng() * 0.14,
        }));
        const edges: Edge[] = raw.map((e) => ({
          id: uid('e'),
          source: neurons[e.a].id,
          target: neurons[e.b].id,
          relationType: tpl.relationType,
          direction: 'both',
          weight: 0.5,
        }));
        set({
          neurons,
          edges,
          task: tpl.task,
          settings: {
            ...get().settings,
            topology: tpl.topology,
            count: tpl.count,
            density: tpl.density,
            regime: tpl.regime,
            seed: Math.floor(Math.random() * 1e9),
          },
          selectedNeuronId: null,
          selectedEdgeId: null,
          round: 0,
        });
        get().recomputeActivity();
      },

      startSearch: async (opts) => {
        const { api } = get();
        if (!api.model.trim()) {
          set({ searchError: '请先在「模型设置」里填写模型名' });
          return;
        }
        if (api.provider === 'openai' && !api.apiKey.trim()) {
          set({ searchError: '请先在「模型设置」里填写 API Key' });
          return;
        }
        const proxyOk = await checkProxy();
        if (!proxyOk) {
          set({ searchError: '连不上本地代理(:8787)，场景穷举需要本地运行（npm run dev）。' });
          return;
        }
        const tpl = SCENARIO_TEMPLATES.find((t) => t.id === opts.templateId);
        if (!tpl) return;
        const variants = generateVariants(tpl, opts.variants, makeRng(Math.floor(Math.random() * 1e9)));
        const controller = new AbortController();
        set({
          searchRunning: true,
          searchError: '',
          searchController: controller,
          searchProgress: { current: 0, total: variants.length },
          searchResults: [],
        });
        try {
          const results: ScenarioResult[] = [];
          for (let i = 0; i < variants.length; i++) {
            if (controller.signal.aborted) break;
            set((s) => ({ searchProgress: { current: i, total: variants.length } }));
            const v = variants[i];
            const messages = await runSimulation({
              neurons: v.neurons,
              edges: v.edges,
              task: v.task,
              getApi: () => api, // 场景变体神经元未指定模型 → 用全局
              rounds: opts.rounds,
              signal: controller.signal,
              memories: [],
              onMessage: () => {},
            });
            const metrics = computeMetrics(messages, v.neurons.length);
            const real = messages.filter((m) => m.real && m.relationType !== '错误' && m.content);
            const summary = real.length ? real[real.length - 1].content.slice(0, 90) : '（无有效输出）';
            results.push({ variant: v, metrics, messages, summary });
            set((s) => ({
              searchResults: [...results].sort((a, b) => b.metrics.score - a.metrics.score),
            }));
          }
        } catch (e) {
          set({ searchError: e instanceof Error ? e.message : String(e) });
        } finally {
          set({ searchRunning: false });
        }
      },

      stopSearch: () => {
        get().searchController?.abort();
        set({ searchRunning: false });
      },

      loadScenarioResult: (r) => {
        set({
          neurons: r.variant.neurons,
          edges: r.variant.edges,
          task: r.variant.task,
          settings: {
            ...get().settings,
            topology: r.variant.topology,
            regime: r.variant.regime,
            density: r.variant.density,
            count: r.variant.neurons.length,
          },
          selectedNeuronId: null,
          selectedEdgeId: null,
          round: 0,
        });
        get().recomputeActivity();
      },

      viewScenarioResult: (r) => {
        const rounds = r.messages.length ? Math.max(...r.messages.map((m) => m.round + 1)) : 0;
        const rec: RunRecord = {
          id: uid('run'),
          at: Date.now(),
          task: r.variant.task,
          rounds,
          messages: r.messages,
          metrics: r.metrics,
        };
        set((s) => ({ runs: [rec, ...s.runs].slice(0, 5), selectedRunId: rec.id }));
      },

      addGroup: (name, parentId) => {
        const g: Group = {
          id: uid('g'),
          name: name.trim() || `群组 ${get().groups.length + 1}`,
          parentId,
          memberIds: [],
          color: GROUP_COLORS[get().groups.length % GROUP_COLORS.length],
        };
        set((s) => ({ groups: [...s.groups, g] }));
        return g.id;
      },
      renameGroup: (id, name) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)) })),
      setGroupParent: (id, parentId) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, parentId: parentId ?? null } : g)),
        })),
      removeGroup: (id) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id && g.parentId !== id) })),
      setMembership: (neuronId, groupId) =>
        set((s) => ({
          groups: s.groups.map((g) => ({
            ...g,
            memberIds:
              g.id === groupId
                ? g.memberIds.includes(neuronId)
                  ? g.memberIds
                  : [...g.memberIds, neuronId]
                : g.memberIds.filter((m) => m !== neuronId),
          })),
        })),
      promoteMemory: (memoryId, groupId) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === memoryId
              ? {
                  ...m,
                  level: 'group' as const,
                  scope: groupScope(s.groups, groupId),
                  ownerId: `group:${groupId}`,
                }
              : m
          ),
        })),

      onboardNeuron: async (neuronId) => {
        const { neurons, task, memories } = get();
        const n = neurons.find((x) => x.id === neuronId);
        if (!n) return;
        const resolved = get().resolveApi(neuronId);
        if (!resolved.model.trim()) return;
        const proxyOk = await checkProxy();
        if (!proxyOk) return; // 无代理时静默跳过（可视化仍可用）
        set({ onboardingId: neuronId });
        try {
          const others = neurons.filter((x) => x.id !== neuronId);
          const intro = others
            .map((x) => `- ${x.name}${x.role ? `（${x.role}）` : '（成员）'}`)
            .join('\n');
          const system =
            (n.systemPrompt.trim() ? n.systemPrompt : `你是「${n.name}」${n.role ? '，身份：' + n.role : ''}。`) +
            '\n\n【平台规则】你刚进入一个新环境，像人进入新环境一样：先自我介绍，再写下你对这个环境的初始印象。' +
            '第一行自我介绍，之后每行一条印象，共不超过 4 行。';
          const user = `总任务：${task}\n\n环境里已有的成员：\n${intro || '（空环境）'}\n\n请自我介绍并记录初始印象。`;
          const content = await chat({
            provider: resolved.provider,
            baseURL: resolved.baseURL,
            apiKey: resolved.apiKey,
            model: resolved.model,
            temperature: 0.7,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          });
          const lines = content
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 4);
          const now = Date.now();
          const news: Memory[] = [
            {
              id: uid('mem'),
              ownerId: neuronId,
              level: 'personal',
              scope: [neuronId],
              type: 'event',
              content: `刚进入环境，认识了 ${others.length} 个成员。`,
              createdAt: now,
              strength: 1,
              halfLifeMs: EVENT_HALF_LIFE,
            },
            {
              id: uid('mem'),
              ownerId: neuronId,
              level: 'personal',
              scope: [neuronId],
              type: 'inference',
              content: lines.length ? lines.join('；') : '对环境的初始印象：有待观察。',
              createdAt: now,
              strength: 1,
              halfLifeMs: INFERENCE_HALF_LIFE,
            },
          ];
          set((s) => ({ memories: pruneMemories([...s.memories, ...news]) }));
        } catch {
          /* 静默：失败不影响画布 */
        } finally {
          set({ onboardingId: null });
        }
      },

      duplicateNeuron: (id) => {
        const { neurons, groups } = get();
        const src = neurons.find((n) => n.id === id);
        if (!src) return null;
        const newId = uid('n');
        const copy: Neuron = {
          ...src,
          id: newId,
          name: `${src.name} 副本`,
          pos: [src.pos[0] + 0.7, src.pos[1] + 0.5, src.pos[2]] as Vec3,
        };
        set((s) => ({
          neurons: [...s.neurons, copy],
          groups: s.groups.map((g) =>
            g.memberIds.includes(id) ? { ...g, memberIds: [...g.memberIds, newId] } : g
          ),
          selectedNeuronId: newId,
          selectedEdgeId: null,
        }));
        get().recomputeActivity();
        void get().onboardNeuron(newId);
        return newId;
      },

      exportProject: () => {
        const { task, runRounds, settings, neurons, edges, groups, memories, modelProfiles } = get();
        // 安全：导出时抹掉所有 API Key（导入后需重新填写）
        const safeProfiles = modelProfiles.map((p) => ({ ...p, apiKey: '' }));
        const file = makeProjectFile({
          task,
          runRounds,
          settings,
          neurons,
          edges,
          groups,
          memories,
          modelProfiles: safeProfiles,
        });
        const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `together-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      },

      importProject: (data) => {
        const f = parseProjectFile(data);
        if (!f) {
          set({ runError: '导入失败：文件格式不正确（需要 together v1 项目文件）' });
          return false;
        }
        set({
          task: f.task,
          runRounds: f.runRounds,
          settings: { ...get().settings, ...f.settings },
          neurons: f.neurons,
          edges: f.edges,
          groups: f.groups,
          memories: f.memories,
          modelProfiles: f.modelProfiles,
          selectedNeuronId: null,
          selectedEdgeId: null,
          round: 0,
        });
        get().recomputeActivity();
        return true;
      },
    }),
    {
      name: 'together-v1',
      partialize: (s) => ({
        api: s.api,
        modelProfiles: s.modelProfiles,
        task: s.task,
        runRounds: s.runRounds,
        memories: s.memories,
        groups: s.groups,
      }),
    }
  )
);
