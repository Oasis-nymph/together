import { chat } from './llm';
import type { ApiConfig } from './types';

export interface JudgeInput {
  from: string;
  relationType: string;
  content: string;
}

export interface JudgeResult {
  consensus: number; // 0-1 结论一致性
  quality: number; // 0-1 任务完成度
}

function extractJson(text: string): { consensus: number; quality: number } | null {
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    const c = Number(obj.consensus);
    const q = Number(obj.quality);
    if (!Number.isFinite(c) || !Number.isFinite(q)) return null;
    return { consensus: Math.min(1, Math.max(0, c)), quality: Math.min(1, Math.max(0, q)) };
  } catch {
    return null;
  }
}

/**
 * 裁判模型：对"结论一致性"与"任务完成度"打分（弥补字符相似度的语义盲区）。
 */
export async function judgeRun(opts: {
  api: ApiConfig;
  task: string;
  keypoints?: string[];
  finals: JudgeInput[];
  signal?: AbortSignal;
}): Promise<JudgeResult> {
  const { api, task, keypoints = [], finals, signal } = opts;
  const excerpts = finals
    .slice(0, 12)
    .map((f) => `- [${f.from}|${f.relationType}] ${f.content.slice(0, 240)}`)
    .join('\n');

  const system =
    '你是多智能体对话的评测裁判。只输出一行 JSON，格式：{"consensus":0到1,"quality":0到1}，不要其他文字。' +
    'consensus = 各成员最终结论的一致程度；quality = 对总任务的覆盖与完成程度。';
  const user =
    `总任务：${task}\n` +
    (keypoints.length ? `任务关键点（逐个检查是否覆盖）：\n${keypoints.map((k) => `- ${k}`).join('\n')}\n` : '') +
    `成员最终发言摘录：\n${excerpts || '（无有效发言）'}`;

  const content = await chat({
    provider: api.provider,
    baseURL: api.baseURL,
    apiKey: api.apiKey,
    model: api.model,
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    signal,
  });

  const parsed = extractJson(content);
  if (parsed) return parsed;
  // 解析失败：回退到保守估计
  return { consensus: 0.5, quality: 0.5 };
}
