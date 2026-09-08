// together —— 零依赖 LLM 代理服务器
// 作用：转发前端请求到 OpenAI 兼容接口 / 本地 Ollama，规避浏览器 CORS 限制，并保护 API Key 不跨域暴露。
// 用法：node server.mjs            （端口 8787）
//       npm run build && npm start （同时托管 dist/ 静态文件）
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const DIST = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

/** 上游调用统一入口，返回 { content } 或抛出错误 */
async function callUpstream(body) {
  const base = String(body.baseURL || '').replace(/\/+$/, '');
  if (!base) throw new Error('缺少 baseURL');
  const timeout = AbortSignal.timeout(180000);

  if (body.provider === 'ollama') {
    const r = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        stream: false,
        options: { temperature: Number(body.temperature ?? 0.7) },
      }),
      signal: timeout,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `Ollama HTTP ${r.status}`);
    const content = data?.message?.content ?? '';
    if (typeof content !== 'string' || !content) throw new Error('Ollama 返回为空');
    return { content };
  }

  // OpenAI 兼容（OpenAI / DeepSeek / Moonshot / 通义 / 硅基流动 等）
  const headers = { 'Content-Type': 'application/json' };
  if (body.apiKey) headers.Authorization = `Bearer ${body.apiKey}`;
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: Number(body.temperature ?? 0.7),
    }),
    signal: timeout,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `上游 HTTP ${r.status}`);
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (typeof content !== 'string' || !content) throw new Error('上游返回为空');
  return { content };
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && url === '/api/chat') {
    try {
      const body = await readBody(req);
      const out = await callUpstream(body);
      sendJson(res, 200, out);
    } catch (e) {
      sendJson(res, 502, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  // 静态托管 dist/（生产模式）
  if (req.method === 'GET') {
    let filePath = url === '/' ? '/index.html' : url;
    filePath = normalize(filePath).replace(/^([.\\/])+/, '');
    const full = join(DIST, filePath);
    try {
      const data = await readFile(full);
      res.writeHead(200, { 'Content-Type': MIME[extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
      return;
    } catch {
      try {
        const data = await readFile(join(DIST, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
        return;
      } catch {
        /* fallthrough to info */
      }
    }
  }

  sendJson(res, 200, {
    name: 'together-server',
    message: 'LLM 代理运行中。POST /api/chat 转发到 OpenAI 兼容接口或 Ollama。生产模式请先 npm run build。',
  });
});

server.listen(PORT, () => {
  console.log(`[together] 代理服务器已启动: http://localhost:${PORT}  (POST /api/chat)`);
});
