# together

> 把 AI 对话体当作神经元，放进四维纯白空间：连线、对话、记忆、演化——观察涌现是否发生。
> AI agents as neurons in a white 4-D space: connect them, let them talk, remember, evolve — and watch for emergence.

## 快速入口 · Quick Links

- 🌐 **在线打开** [Open online](https://oasis-nymph.github.io/together/) —— 可视化可直接玩；真实 AI 对话需本地运行 / visuals work online; real AI chat runs locally
- ⬇️ **下载源码** [Download source (zip)](https://github.com/Oasis-nymph/together/archive/refs/heads/main.zip)
- 🐙 **GitHub 仓库** [Repository](https://github.com/Oasis-nymph/together)
- ▶️ **本地运行** [Run locally]：`npm install && npm run dev` → http://localhost:5173

## 论文 · Papers

论文统一收录在 [`papers/`](papers/) 目录，新论文持续追加、不覆盖旧论文 / All papers live in `papers/`, appended, never replaced:

1. [together：一个以涌现为观察目标的多智能体系统科学实验平台](papers/paper-01-emergence.md) —— 五系统状态对照实验 + 记忆库实证 / 5-regime controlled experiment & memory-store evidence

## 文档 · Docs

- [设计大纲与计划](PLAN.md) · Design & roadmap
- [代码改进清单](IMPROVEMENTS.md) · Improvement backlog
- [早期 3D 原型](prototype.html) · Early prototype（单文件直接打开 / opens directly, CDN）

## 状态 · Status

**v0.2** —— 可视化 + 真实 AI 对话 + 多层级记忆库 + 涌现观察 + 涌现场景穷举；细节见 [PLAN.md](PLAN.md) 进度表 / visuals + real AI chat + multi-level memory + emergence metrics + scenario search.

## 本地运行 · Run Locally

```bash
npm install
npm run dev     # 前端(5173) + LLM 代理(8787)
```

生产模式 / Production：`npm run build && npm start` → http://localhost:8787
