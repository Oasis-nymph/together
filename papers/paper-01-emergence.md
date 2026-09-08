# together：一个以涌现为观察目标的多智能体系统科学实验平台

> 技术报告 / 工作论文（v0.1）· 作者：Oasis-nymph · 2026
> 源码：https://github.com/Oasis-nymph/together

**摘要**：现有 LLM 数据科学智能体（DeepAnalyze、EvoDS、DS-STAR 等）以"任务完成"为目标：让智能体跑通数据科学流水线并给出正确结果。本文提出一个互补视角：把多智能体协作本身当作**观察对象**，以**涌现是否发生**为目标。together 是一个轻量的交互式平台，将 AI 对话体建模为神经元（节点）与可定义关系的突触（边），平台只负责收集消息并标注元信息、把取舍交给模型；引入多层级发散记忆库（归属范围读写、衰减、推论由模型生成）、系统状态光谱（简单→无序，对应秩序↔混沌）、场景穷举与涌现指标。我们报告一项对照实验：同一问题、同一网络，仅改变系统状态（5 档），各运行 3 轮（14 神经元）。结果：**混沌边缘获得最高涌现分与最高新颖性**（与"混沌边缘"理论一致）；高噪声的混沌档出现真实退化（消息减少、调用失败）；五档最终结论高度稳健，且无预设角色的神经元自发出现分工。

**Abstract (EN)**: Existing LLM data-science agents (DeepAnalyze, EvoDS, DS-STAR, etc.) are task-oriented: they aim to complete pipelines and produce correct results. We propose a complementary perspective: treat multi-agent collaboration itself as the object of study, with emergence as the target. together is a lightweight interactive platform that models AI conversational agents as neurons (nodes) and definable relationships as synapses (edges); the platform only collects messages, tags metadata, and leaves arbitration to the models. It introduces a multi-level divergent memory store (scoped access, decay, model-generated inferences), a system-state spectrum (simple → disorder, i.e., order ↔ chaos), scenario enumeration, and emergence metrics. We report a controlled experiment: identical question and network, varying only the system state (5 levels, 3 rounds, 14 neurons). Results: **the edge-of-chaos regime achieves the highest emergence score and novelty** (consistent with edge-of-chaos theory); the high-noise chaotic regime degrades (fewer messages, call failures); final conclusions remain robust across regimes, and role-less neurons spontaneously specialize.

---

## 1. 引言

大模型正在从"单个对话助手"走向"多智能体系统"。在数据科学方向，近年出现了一批以**任务完成**为导向的系统：DeepAnalyze [1] 用多智能体协作覆盖从数据理解到建模的完整流程；EvoDS [2] 通过技能学习与上下文管理实现自进化；DS-STAR [3] 面向统计分析的自动流水线；Data Interpreter [4]、AlphaFlow [5]、DS-Agent [6] 分别用层次规划、工作流搜索与案例推理解决具体任务；AutoML 传统路线 [7][8]（Auto-WEKA、Auto-sklearn、TPOT、H2O、AutoGluon）则提供了不依赖 LLM 的系统底座。

这些工作共享一个隐含假设：**多智能体系统的价值在于"把任务做对"**。而复杂系统科学提示了另一个问题：当大量自利、异构的个体以局部规则交互时，全局秩序可能**自发涌现**——合作、分工、共识、规范。已有研究（如硅基社会实验 Moltbook、LLM 社会博弈中的合作涌现）开始观察这类现象，但缺少一个**可玩、可配置、以涌现为第一目标**的通用实验平台。

本文的贡献：

1. **together 平台**：神经元隐喻 + 可定义关系语义 + "取舍交给模型" + 多层级记忆 + 系统状态光谱 + 场景穷举 + 涌现指标（§2）；
2. **对照实验**：五档系统状态 × 同一问题的初步结果与三个发现（§3）；
3. **定位分析**：与任务导向智能体的差异与互补（§4），及诚实的局限与改进路线（§5）。

## 2. 系统设计

### 2.1 神经元与突触（节点 / 边 / 关系）
- **节点**＝一个 AI 对话体：名称、角色、系统提示词、可独立指定的模型（模型库支持不同节点用不同 AI）。
- **边**＝一段可定义的关系：方向（双向/单向）、关系类型（指令/批判/总结/投票/竞争/自定义）、权重、关系提示词模板。边不只是管道，而是"变换器"。

### 2.2 消息聚合交给模型（核心设计决策）
平台**不做任何智能聚合**。每个节点收到的多条消息被逐条标注元信息（`[来自: X｜关系: R｜权重: W]`）后原样打包进一次 LLM 调用，**如何取舍、加权、合并完全由模型判断**。权重视为先验提示而非硬规则。这一设计把"判断力"完全留在微观个体，是涌现可能发生的结构前提。

### 2.3 多层级发散记忆库
- 记忆按**归属范围**读写：个人记忆仅本人可读；共同记忆双方可读；群组记忆全体成员（含子组）可读。
- 类型：事件记忆（平台自动记录）与**推论记忆（由该单位的模型生成**，平台只负责存取）。
- 衰减：每条记忆带半衰期；重要记忆可"固化上升"（个人→群组）。
- 记忆按强度注入下一轮提示词，实现"带着记忆说话"。

### 2.4 系统状态光谱（简单 → 无序）
受《复杂：诞生于秩序与混沌边缘的科学》启发，将系统状态设为可调参数，映射到两个底层量：
- **波动强度 wave**：消息沿语义方向正常投递的概率（1=严格、0=不投递）；
- **噪声 noise**：消息额外被随机转发给其他节点的概率。
五档预设：简单(1,0)、有序(1,0.05)、混沌边缘(1,0.22)、混沌(0.5,0.6)、无序(0,0.9)，另有自定义。

### 2.5 涌现场景穷举
涌现无法被命令，只能被搜索：场景生成器按"角色×状态光谱×拓扑×风格"生成变体，批量运行（规模上限由用户自定义），按涌现分排名，支持一键载入画布。

### 2.6 涌现指标
由对话记录计算、只观察全局量：
- **参与度**：发言神经元占比；
- **共识度**：消息两两相似度均值（字符二元组 Jaccard，免分词）；
- **新颖性**：相邻消息不相似度；
- **发言均匀度**：发言分布的归一化熵（分工/寡头的信号）；
- **关系多样性**：关系类型丰富度；
- **综合涌现分** = 100 × 参与度 × (0.35 共识 + 0.25 新颖 + 0.25 均匀 + 0.15 关系多样性)。

## 3. 实验

### 3.1 设置
- 问题：「AI 如何构建自主数据科学系统？请合作给出完整方案。」
- 网络：14 个神经元（无预设角色、空提示词，仅以编号自居），分簇拓扑，同一随机种子 → 五组**同一世界**。
- 每组 3 轮，模型 deepseek-chat，温度 0.7；唯一变量 = 系统状态。
- 运行方式：无头运行核心引擎（与 UI 同源代码），经本地零依赖代理调用。

### 3.2 结果

| 系统状态 | wave/noise | 涌现分 | 参与 | 共识 | 新颖 | 有效消息 |
|---|---|---|---|---|---|---|
| 简单 | 1.0 / 0 | 52 | 100% | 0.105 | 0.862 | 162 |
| 有序 | 1.0 / 0.05 | 53 | 100% | 0.104 | 0.886 | 162 |
| **混沌边缘** | 1.0 / 0.22 | **54** | 100% | **0.112** | **0.915** | 162 |
| 混沌 | 0.5 / 0.6 | 52 | 100% | 0.120 | 0.841 | 154（2 次调用失败） |
| 无序 | 0 / 0.9 | 53 | 100% | 0.104 | 0.889 | 159 |

### 3.3 发现

**发现 1（混沌边缘最优）**：混沌边缘档获得最高涌现分（54）与最高新颖性（0.915），与"秩序与混沌边缘行为最丰富"的理论预期一致。

**发现 2（混沌档真实退化）**：高噪声下有效消息最少（154），第 3 轮 2 个节点调用失败，新颖性最低（0.841）——噪声越过临界后伤害而非促进协作。

**发现 3（共识稳健）**：五档的最终结论高度一致——自主数据科学系统 = 分层闭环架构 + 验证与信任护栏 + 元认知自省 + 记忆复用。该问题的"共识解"对状态扰动稳健。

**发现 4（自发分工）**：无预设角色的 14 个神经元自发分化出架构、数据工程、验证安全、元认知治理、执行闭环等不同侧重，且互相引用对方的编号（"我认同神经元 6 的决策内核"）。

## 4. 相关工作与差异化

| 工作 | 类型 | 与 together 的关系 |
|---|---|---|
| DeepAnalyze (arXiv:2510.16872) | 任务导向多智能体 DS 系统 | **互补**：同为多智能体，但其目标是跑通数据科学任务；together 以涌现为观察目标 |
| EvoDS (KDD'26) | 自进化 DS 智能体（技能学习+上下文管理） | 互补：其"技能/上下文"对应我们的记忆库，可借鉴其技能固化机制 |
| DS-STAR / Data Interpreter / AlphaFlow / DS-Agent | 任务导向 DS 智能体 | 互补：可作为 together 的"任务完成度"评测模块接入 |
| MLAgentBench (Meta) | 评测基准 | **可整合**：用其任务集量化 together 场景的任务完成质量 |
| AutoML 综述与经典系统（Auto-WEKA/Auto-sklearn/TPOT/H2O/AutoGluon） | 传统技术路线 | 底座参考：非 LLM 对话式，无涌现观察维度 |
| AutoDS (CHI'21) | 人本自动化 | 互补：可借鉴人机协同设计（干预/耳语） |
| Moltbook / Generative Agents | 涌现观察研究 | 最近的精神前作，但非平台、不可配置 |

**结论：没有发现直接重复。** 现有系统是"任务求解器"，together 是"涌现观察平台"——两者的关系类似"解题比赛"与"生态观察箱"。差异化支柱有四：①以涌现为第一目标（指标、场景穷举、排名）；②系统状态光谱作为一阶可调变量；③记忆归属范围读写 + 推论由模型生成；④神经元隐喻的交互式可视化。风险在于：若不做任务完成度评测，易被视为"只有演示价值"——这正是 §5 的第一改进项。

## 5. 局限与未来工作

1. **指标粗糙**：共识度用字符二元组 Jaccard，无语义；无嵌入相似度、无 LLM-as-judge、无消融/因果分析。
2. **样本极小**：5 档 × 1 次、3 轮，方差未控；发现 1–3 需重复实验（每档 ≥5 次）确认。
3. **任务完成度未评测**：应接入 MLAgentBench 类基准。
4. **记忆无向量检索**：当前按强度注入前 6 条，无语义召回；无记忆强化。
5. **调度脆弱**：固定并发 2、无重试（混沌档 2 次失败即源于此）、无 token 预算与统计。
6. **系统状态只作用于投递层**：可扩展到温度、规则严格度、采样策略。
7. 时间分支、进化选择压力、Hebbian 边权重、群组级对话聚合尚未实现（详见 IMPROVEMENTS.md）。

## 参考文献

1. DeepAnalyze: Agentic Large Language Models for Autonomous Data Science. arXiv:2510.16872.
2. EvoDS: Self-Evolving Autonomous Data Science Agent with Skill Learning and Context Management. KDD 2026.
3. DS-STAR: An Autonomous AI Agent for Automated Statistical Analysis, Visualization, and Data Wrangling. IEEE.
4. Data Interpreter: An LLM Agent for Data Science. ACL Findings 2025.
5. AlphaFlow: Autonomous Discovery and Optimization of Multi-Step LLM Data Science Workflows. arXiv:2502.02662.
6. DS-Agent: Automated Data Science by Empowering Large Language Models with Case-Based Reasoning. arXiv:2402.07567.
7. AutoML to Date and Beyond: Challenges and Opportunities. ACM Computing Surveys.
8. Automated Machine Learning: Past, Present and Future. Springer (Hutter et al.).
9. MLAgentBench: Evaluating Language Agents on Machine Learning Experimentation. arXiv:2310.03302.
10. AutoDS: Towards Human-Centered Automation of Data Science. CHI 2021.
11. LLM-Based Data Science Agents: A Survey of Capabilities, Challenges, and Future Directions. arXiv:2510.04023.
12. Large Language Model-based Data Science Agent: A Survey (Wang & Yu et al.).
13. Towards Automated Integration of Novel ML Tools Into LLM-driven AutoML Agents.
14. Exploring Silicon-Based Societies: An Early Study of the Moltbook Agent Community.
15. [Re] Cooperate or Collapse: Emergence of Sustainable Cooperation in a Society of LLM Agents.
16. Generative Agents: Interactive Simulacra of Human Behavior (Stanford).
17. M. M. Waldrop, Complexity: The Emerging Science at the Edge of Order and Chaos. 1992.

## 附录：实证数据（真实输出，非转述）

### A1. 自发分工证据（混沌边缘档，第 1 轮各神经元的原话摘录）

| 神经元 | 自我认领的分工（原话） |
|---|---|
| 1 | "我先从**系统架构与核心能力层**切入，给出一个基础框架" |
| 4 | "我负责**元认知与自评机制**设计，请其他神经元补充分层细节、工具链选型及失败恢复策略" |
| 5 | "我负责从**知识工程与自主推理架构**角度切入，而非重复数据流水线细节" |
| 10 | "我的职责是聚焦于**决策与自适应闭环**，这是区别于传统自动化流水线的核心" |
| 11 | "我从**数据质量与验证**角度切入……数据获取、清洗、特征工程、建模、评估、解释和迭代的闭环" |
| 14 | "我聚焦于……**自我验证与纠错机制**这一核心子问题，这是区分自动化流水线与真正自主的关键" |

> 14 个神经元无任何预设角色（提示词为空），分工完全是互动中自发形成的。

### A2. 记忆库实况（混沌边缘档，3 轮，完整记忆流程）

- **个人记忆 210 条**（每条记录"谁、第几轮、对谁、以什么关系、说了什么"，仅本人可读）
- **共同记忆 201 条**（对话双方的共享记忆，双方可读）
- **推论记忆 9 条**（3 个神经元各自用模型从经历中提炼，示例原话）：
  - 神经元 1：*"验证与失败回溯是防自我欺骗的底线，必须内建于每一阶段而非事后补救。"*
  - 神经元 6：*"工程化瓶颈在于 LLM 输出与确定性执行之间的接口契约，必须用 STD 协议（Schema、Test、Data）显式约束。"*
  - 神经元 14：*"自主数据科学系统的核心矛盾不在模型能力，而在'统计严谨性'与'自主性'的冲突——系统越自主，越需要内置因果验证与反模式记忆来防止'自信地犯错'。"*

> 完整数据：`experiments/experiment-memory-report.json`（逐条记忆）与 `experiments/experiment-report.json`（五状态全部对话）。

## 附：复现

```bash
cd together
npm install
npm run dev        # 打开 http://localhost:5173，右侧配置模型后 ▶ 开始对话
```
五状态对照实验（无头）：见 `experiments/` 目录（脚本与数据，Key 从环境变量读取）。
