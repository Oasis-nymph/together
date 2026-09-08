// 【实验脚本，仅在副本中】重跑混沌边缘档 + 完整记忆流程，产出"记忆库"实体数据
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { runSimulation } = require('../build-headless/runner.js');
const { genPositions, genEdges } = require('../build-headless/topology.js');
const { makeRng } = require('../build-headless/random.js');
const { REGIMES } = require('../build-headless/activity.js');
const { chat } = require('../build-headless/llm.js');
const {
  decayedStrength,
  pruneMemories,
  readableMemories,
  EVENT_HALF_LIFE,
  INFERENCE_HALF_LIFE,
} = require('../build-headless/memory.js');

const API = {
  provider: 'openai',
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.EXPERIMENT_API_KEY || '',
  model: 'deepseek-chat',
  temperature: 0.7,
};
const TASK = 'AI 如何构建自主数据科学系统？请合作给出完整方案。';

function buildWorld() {
  const rng = makeRng(20260721);
  const pos = genPositions(14, 'clusters', rng);
  const raw = genEdges(14, 'clusters', 0.25, pos, rng);
  const neurons = pos.map((p, i) => ({
    id: `n-${i}`,
    name: `神经元 ${i + 1}`,
    role: '',
    systemPrompt: '',
    pos: p,
    radius: 0.3,
  }));
  const edges = raw.map((e) => ({
    id: `e-${e.a}-${e.b}`,
    source: neurons[e.a].id,
    target: neurons[e.b].id,
    relationType: '指令',
    direction: 'both',
    weight: 0.5,
  }));
  return { neurons, edges };
}

/** 与主程序 store.addEventMemories 完全一致的记忆写入逻辑 */
function addEventMemories(memories, msgs, neurons) {
  const nameOf = (id) => neurons.find((n) => n.id === id)?.name ?? id;
  const now = Date.now();
  const news = [];
  for (const m of msgs) {
    if (!m.toId || m.relationType === '错误') continue;
    const text = m.content.length > 160 ? m.content.slice(0, 160) + '…' : m.content;
    news.push({
      id: `mem-${memories.length + news.length}`,
      ownerId: m.fromId,
      level: 'personal',
      scope: [m.fromId],
      type: 'event',
      content: `第 ${m.round + 1} 轮对「${nameOf(m.toId)}」说（${m.relationType}）：${text}`,
      createdAt: now,
      strength: 1,
      halfLifeMs: EVENT_HALF_LIFE,
    });
    news.push({
      id: `mem-${memories.length + news.length}`,
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
  return pruneMemories([...memories, ...news]);
}

/** 与主程序 store.distillMemory 一致的"整理记忆"（推论由模型生成） */
async function distill(neuron, memories, runMessages, task) {
  const readable = readableMemories(memories, neuron.id).slice(0, 12);
  const mine = runMessages.filter((m) => m.fromId === neuron.id || m.toId === neuron.id).slice(-12);
  const persona = neuron.systemPrompt.trim() || `你是「${neuron.name}」。`;
  const system =
    persona +
    '\n\n【平台规则】请回顾你的经历，提炼最多 3 条你认为最重要、值得记住的结论/印象/约定。每条一行，直接写内容，不要编号。';
  const user =
    `总任务：${task}\n\n你的经历：\n` +
    readable.map((m) => `- [记忆] ${m.content}`).join('\n') +
    '\n' +
    mine.map((m) => `- [第${m.round + 1}轮] ${m.content.slice(0, 120)}`).join('\n');
  const content = await chat({
    provider: API.provider,
    baseURL: API.baseURL,
    apiKey: API.apiKey,
    model: API.model,
    temperature: 0.5,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return content
    .split('\n')
    .map((l) => l.replace(/^[\d\-\*\s\.、]+/, '').trim())
    .filter((l) => l.length >= 6)
    .slice(0, 3);
}

async function main() {
  const { neurons, edges } = buildWorld();
  const nameOf = (id) => neurons.find((n) => n.id === id)?.name ?? id;
  let memories = [];
  const runMessages = [];

  console.log('重跑混沌边缘档（3 轮），完整记忆流程……');
  await runSimulation({
    neurons,
    edges,
    task: TASK,
    getApi: () => API,
    rounds: 3,
    signal: new AbortController().signal,
    memories: [],
    regime: REGIMES.edge,
    onMessage: (m) => runMessages.push(m),
    onRoundDone: (msgs) => {
      if (msgs.length) memories = addEventMemories(memories, msgs, neurons);
    },
  });

  // 3 个代表神经元整理记忆（推论由模型生成）
  const distills = {};
  for (const pick of ['n-0', 'n-5', 'n-13']) {
    const n = neurons.find((x) => x.id === pick);
    console.log(`  → ${n.name} 正在整理记忆（推论记忆）…`);
    try {
      const lines = await distill(n, memories, runMessages, TASK);
      const now = Date.now();
      for (const l of lines) {
        memories.push({
          id: `mem-inf-${memories.length}`,
          ownerId: n.id,
          level: 'personal',
          scope: [n.id],
          type: 'inference',
          content: l,
          createdAt: now,
          strength: 1,
          halfLifeMs: INFERENCE_HALF_LIFE,
        });
      }
      distills[n.name] = lines;
    } catch (e) {
      distills[n.name] = ['（整理失败：' + (e.message || e) + '）'];
    }
  }
  memories = pruneMemories(memories);

  // 输出记忆库（按可读范围分组）
  console.log('\n========== 记忆库实况 ==========');
  const groups = {
    personal: memories.filter((m) => m.level === 'personal'),
    shared: memories.filter((m) => m.level === 'shared'),
    inference: memories.filter((m) => m.type === 'inference'),
  };
  console.log(`\n【个人记忆】共 ${groups.personal.length} 条，示例（按强度排序前 12）：`);
  for (const m of groups.personal.slice(0, 12)) {
    console.log(`  ·[${nameOf(m.ownerId)}|强度${decayedStrength(m).toFixed(2)}] ${m.content.slice(0, 90)}`);
  }
  console.log(`\n【共同记忆】共 ${groups.shared.length} 条，示例（前 8）：`);
  for (const m of groups.shared.slice(0, 8)) {
    const pair = m.scope.map(nameOf).join('+');
    console.log(`  ·[${pair}|强度${decayedStrength(m).toFixed(2)}] ${m.content.slice(0, 90)}`);
  }
  console.log(`\n【推论记忆（模型生成）】共 ${groups.inference.length} 条：`);
  for (const [who, lines] of Object.entries(distills)) {
    console.log(`  ▸ ${who}：`);
    for (const l of lines) console.log(`      - ${l}`);
  }

  writeFileSync(
    join(__dirname, 'experiment-memory-report.json'),
    JSON.stringify(
      {
        task: TASK,
        regime: 'edge',
        totalMemories: memories.length,
        personalCount: groups.personal.length,
        sharedCount: groups.shared.length,
        inferenceCount: groups.inference.length,
        personalSample: groups.personal.slice(0, 12).map((m) => ({ owner: nameOf(m.ownerId), strength: +decayedStrength(m).toFixed(2), content: m.content })),
        sharedSample: groups.shared.slice(0, 8).map((m) => ({ scope: m.scope.map(nameOf), strength: +decayedStrength(m).toFixed(2), content: m.content })),
        distills,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log('\n✅ 记忆库报告已写入 experiment-memory-report.json');
}

main().catch((e) => {
  console.error('❌ 失败:', e);
  process.exit(1);
});
