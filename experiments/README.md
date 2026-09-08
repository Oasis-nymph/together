# experiments —— 实验脚本与数据

> 无头实验（不打开网页直接跑核心引擎）。**API Key 从环境变量读取**，不要写进文件：
>
> - Windows PowerShell：`$env:EXPERIMENT_API_KEY="sk-xxx"; node experiment-driver.mjs`
> - macOS/Linux：`EXPERIMENT_API_KEY=sk-xxx node experiment-driver.mjs`
>
> 运行前需：① `npm install`；② 用主仓库的 tsc 编译核心逻辑：`node ..\node_modules\typescript\bin\tsc -p tsconfig-headless.json`（在副本式工作流里做）；③ 启动代理：`node ..\server\server.mjs`。

## 数据文件（真实运行输出）

| 文件 | 内容 |
|---|---|
| `experiment-report.json` | 五系统状态 ×「AI 如何构建自主数据科学系统」全部对话逐条 + 涌现指标（5 MB，完整证据） |
| `experiment-memory-report.json` | 混沌边缘档完整记忆流程：210 个人记忆 + 201 共同记忆 + 9 条模型生成的推论记忆 |
| `experiment-summary.md` | 对比摘要（指标表 + 三个发现） |

## 脚本

| 文件 | 作用 |
|---|---|
| `experiment-driver.mjs` | 五状态对照实验（问题、轮数、模型可改） |
| `experiment-memory.mjs` | 单场景 + 完整记忆流程（含"整理记忆"） |
| `tsconfig-headless.json` | 把 `src/core` 编译成 Node 可跑的 CommonJS |

## 结论速览（详见论文 papers/paper-01-emergence.md）

- 混沌边缘涌现分最高（54）· 混沌档出现真实退化（2 次调用失败）
- 14 个无预设角色的神经元自发分工
- 记忆库按归属范围读写：个人 210 条 / 共同 201 条 / 推论 9 条
