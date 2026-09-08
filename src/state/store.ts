import { create } from 'zustand';
import { genEdges, genPositions } from '../core/topology';
import { generateActivity, getRegimeParams } from '../core/activity';
import { makeRng } from '../core/random';
import { ROUNDS } from '../core/types';
import type { Edge, Message, Neuron, Settings, Vec3 } from '../core/types';

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
}

export const useStore = create<TogetherState>()((set, get) => ({
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
}));
