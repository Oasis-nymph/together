import type { Edge, Group, ModelProfile, Neuron, Settings } from './types';
import type { Memory } from './memory';

/** 项目文件：画布、群组、记忆与设置的完整快照（导出/导入） */
export interface ProjectFile {
  app: 'together';
  version: 1;
  task: string;
  runRounds: number;
  settings: Settings;
  neurons: Neuron[];
  edges: Edge[];
  groups: Group[];
  memories: Memory[];
  modelProfiles: ModelProfile[];
}

export function makeProjectFile(p: {
  task: string;
  runRounds: number;
  settings: Settings;
  neurons: Neuron[];
  edges: Edge[];
  groups: Group[];
  memories: Memory[];
  modelProfiles: ModelProfile[];
}): ProjectFile {
  return { app: 'together', version: 1, ...p };
}

export function parseProjectFile(data: unknown): ProjectFile | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.app !== 'together' || d.version !== 1) return null;
  if (!Array.isArray(d.neurons) || !Array.isArray(d.edges)) return null;
  return {
    app: 'together',
    version: 1,
    task: typeof d.task === 'string' ? d.task : '',
    runRounds: typeof d.runRounds === 'number' ? d.runRounds : 6,
    settings: (d.settings as Settings) ?? ({} as Settings),
    neurons: d.neurons as Neuron[],
    edges: d.edges as Edge[],
    groups: Array.isArray(d.groups) ? (d.groups as Group[]) : [],
    memories: Array.isArray(d.memories) ? (d.memories as Memory[]) : [],
    modelProfiles: Array.isArray(d.modelProfiles) ? (d.modelProfiles as ModelProfile[]) : [],
  };
}
