// 【实验脚本，仅在副本中】五系统状态 × 同一问题「AI 如何构建自主数据科学系统」
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { runSimulation } = require('../build-headless/runner.js');
const { computeMetrics } = require('../build-headless/emergence.js');
const { genPositions, genEdges } = require('../build-headless/topology.js');
const { makeRng } = require('../build-headless/random.js');
const { REGIMES } = require('../build-headless/activity.js');

const API = {
  provider: 'openai',
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.EXPERIMENT_API_KEY || '',
  model: 'deepseek-chat',
  temperature: 0.7,
};
const TASK = 'AI 如何构建自主数据科学系统？请合作给出完整方案。';
const ROUNDS = 3;
const COUNT = 14;
const REGIME_LIST = ['simple', 'order', 'edge', 'chaos', 'disorder'];
const REGIME_NAMES = { simple: '简单', order: '有序', edge: '混沌边缘', chaos: '混沌', disorder: '无序' };

/** 五个场景共用同一个世界（固定种子 → 位置/连线完全一致） */
function buildWorld() {
  const rng = makeRng(20260721);
  const pos = genPositions(COUNT, 'clusters', rng);
  const raw = genEdges(COUNT, 'clusters', 0.25, pos, rng);
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

async function main() {
  const report = { task: TASK, rounds: ROUNDS, count: COUNT, api: { ...API, apiKey: '***' }, runs: [] };
  console.log(`实验：${TASK}`);
  console.log(`设置：${COUNT} 个神经元（同一世界）· 每场景 ${ROUNDS} 轮 · deepseek-chat · 温度 0.7\n`);

  for (const rk of REGIME_LIST) {
    const regime = REGIMES[rk];
    const { neurons, edges } = buildWorld();
    const nameOf = (id) => neurons.find((n) => n.id === id)?.name ?? id;
    const messages = [];
    console.log(`\n━━━ 系统状态：${REGIME_NAMES[rk]}（波动强度 ${regime.wave}，噪声 ${regime.noise}）━━━`);

    await runSimulation({
      neurons,
      edges,
      task: TASK,
      getApi: () => API,
      rounds: ROUNDS,
      signal: new AbortController().signal,
      memories: [],
      regime,
      onMessage: (m) => {
        messages.push(m);
        if (m.relationType !== '错误') {
          const from = nameOf(m.fromId);
          const to = m.toId ? nameOf(m.toId) : '?';
          const cut = m.content.length > 90 ? m.content.slice(0, 90) + '…' : m.content;
          console.log(`  [R${m.round + 1}] ${from} → ${to}：${cut}`);
        } else {
          console.log(`  [R${m.round + 1}] ⚠️ ${nameOf(m.fromId)}：${m.content}`);
        }
      },
    });

    const metrics = computeMetrics(messages, neurons.length);
    const real = messages.filter((m) => m.real && m.relationType !== '错误' && m.content);
    const lastRound = messages.length ? Math.max(...messages.map((m) => m.round)) : 0;
    const finals = real
      .filter((m) => m.round === lastRound)
      .map((m) => ({ from: nameOf(m.fromId), to: m.toId ? nameOf(m.toId) : null, content: m.content }));
    console.log(`  → 有效消息 ${real.length} 条 / 发言神经元 ${metrics.speakerCount}/${COUNT}`);
    console.log(
      `  → 涌现分 ${metrics.score}（参与 ${metrics.participation.toFixed(2)} / 共识 ${metrics.consensus.toFixed(2)} / 新颖 ${metrics.novelty.toFixed(2)} / 发言均匀 ${metrics.roleEntropy.toFixed(2)} / 关系多样 ${metrics.relationDiversity.toFixed(2)}）`
    );
    report.runs.push({
      regime: rk,
      regimeName: REGIME_NAMES[rk],
      wave: regime.wave,
      noise: regime.noise,
      metrics,
      finals,
      messages: messages.map((m) => ({
        round: m.round,
        from: nameOf(m.fromId),
        to: m.toId ? nameOf(m.toId) : null,
        relationType: m.relationType,
        content: m.content,
      })),
    });
  }

  writeFileSync(join(__dirname, 'experiment-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('\n✅ 实验完成，完整报告已写入 experiment-report.json');
}

main().catch((e) => {
  console.error('❌ 实验失败:', e);
  process.exit(1);
});
