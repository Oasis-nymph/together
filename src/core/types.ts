import type { EmergenceMetrics } from './emergence';

export type Vec3 = [number, number, number];

/** 神经元 = 一个 AI 对话体 */
export interface Neuron {
  id: string;
  name: string;
  role: string;         // 角色 / 身份描述
  systemPrompt: string; // 系统提示词
  pos: Vec3;
  radius: number;
  modelId?: string | null; // 指定使用的模型（模型库 id）；缺省/null = 跟随全局设置
}

/** 模型库：一个可复用的模型配置（不同神经元可各用各的 AI） */
export interface ModelProfile {
  id: string;
  name: string; // 显示名，如 "GPT-4o mini" / "本地 Qwen"
  provider: 'openai' | 'ollama';
  baseURL: string;
  apiKey: string;
  model: string;
}

export type Direction = 'forward' | 'backward' | 'both';

/** 边 = 一段可定义的关系 */
export interface Edge {
  id: string;
  source: string;
  target: string;
  relationType: string; // 指令 / 批判 / 总结 / 投票 / 竞争 / 自定义
  direction: Direction; // 语义方向
  weight: number;       // 权重（给模型的先验提示，不是硬规则）
}

/** 消息 = 沿边流动的信号（元信息由平台标注，取舍由模型判断） */
export interface Message {
  id: string;
  round: number;
  fromId: string;
  toId: string;
  relationType: string;
  weight?: number;
  content: string;
  real?: boolean; // true = 真实模型输出；缺省 = 模拟信号
}

/** LLM 接入配置（存本地浏览器，经本地代理转发） */
export interface ApiConfig {
  provider: 'openai' | 'ollama';
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 一次真实运行的记录（用于回看与涌现观察） */
export interface RunRecord {
  id: string;
  at: number;
  task: string;
  rounds: number;
  messages: Message[];
  metrics: EmergenceMetrics;
}

export const OPENAI_DEFAULT_URL = 'https://api.openai.com/v1';
export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';

/** 群组 = 分形层级（holon）：可嵌套，群组记忆由全体成员（含子组）可读 */
export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  memberIds: string[];
  color: string;
}

export interface Settings {
  topology: string;
  count: number;
  density: number;
  regime: string;
  wave: number;
  noise: number;
  seed: number;
  concurrency: number; // 同时说话的神经元数（1~8）
  autoDistill: boolean; // 跑完自动为最活跃的神经元整理记忆
}

export const ROUNDS = 80;

export const RELATION_TYPES = ['指令', '批判', '总结', '投票', '竞争', '自定义'];

export const REGIME_OPTIONS = [
  { value: 'simple', label: '简单' },
  { value: 'order', label: '有序' },
  { value: 'edge', label: '混沌边缘' },
  { value: 'chaos', label: '混沌' },
  { value: 'disorder', label: '无序' },
  { value: 'custom', label: '自定义' },
];

export const TOPOLOGY_OPTIONS = [
  { value: 'clusters', label: '分簇（神经网络感）' },
  { value: 'ring', label: '环' },
  { value: 'star', label: '星形' },
  { value: 'grid', label: '网格' },
  { value: 'smallworld', label: '小世界' },
  { value: 'full', label: '全连接' },
  { value: 'random', label: '随机' },
];
