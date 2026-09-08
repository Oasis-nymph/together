import type { ApiConfig, ChatMessage } from './types';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787/api/chat';

/** 探测本地代理是否在线（GitHub Pages 静态部署时给用户清晰提示） */
export async function checkProxy(timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(API_URL.replace('/api/chat', '/api/health'), { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export interface ChatOptions {
  provider: ApiConfig['provider'];
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

/** 经本地代理调用模型（代理负责转发 OpenAI 兼容 / Ollama） */
export async function chat(opts: ChatOptions): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
    signal: opts.signal,
  });
  let data: { content?: string; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    /* ignore parse error */
  }
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  if (typeof data.content !== 'string' || !data.content) {
    throw new Error('模型返回为空');
  }
  return data.content;
}
