# together

一个轻量、可玩、可回放、可嵌套的 **AI 集体系统科学观察平台**：把 AI 对话体当作神经元放进四维纯白空间（3D 空间 + 时间），用可定义关系的连线连接它们，让它们一对多/多对多地对话、记忆、演化，并观察是否有涌现行为。

完整设计与路线图见 [PLAN.md](./PLAN.md)。

## 当前状态：Phase 1 MVP（已接入真实 AI）

- ✅ 四维纯白空间：绿色神经元（胞体 + 内核 + 柔光）、弯曲连接、信号光点流动
- ✅ 点击神经元 → 编辑名称 / 角色（身份）/ 系统提示词；拖拽移动；滚轮缩放、右键平移
- ✅ **连线模式**：依次点击两个神经元建立连接；点击连接 → 编辑关系类型（指令/批判/总结/投票/竞争/自定义）、方向（双向/单向）、权重
- ✅ 系统状态光谱：简单 / 有序 / 混沌边缘 / 混沌 / 无序 / 自定义（波动强度 + 噪声）
- ✅ 拓扑预设：分簇、环、星形、网格、小世界、全连接、随机 + 数量/密度
- ✅ 时间轴（第 4 维）：播放/暂停/拖动，放电波沿网络传播
- ✅ **真实 AI 对话**：每个神经元调用自己的模型；平台只收集消息并标注元信息（来自谁/关系/权重），**取舍完全交给模型**
- ✅ 模型支持：OpenAI 兼容接口（OpenAI/DeepSeek/通义/Moonshot 等）+ 本地 Ollama；本地零依赖代理规避 CORS
- ✅ **多层级发散记忆库**：个人记忆仅自己可读、共同记忆双方可读；事件由平台自动记录；推论记忆由该神经元的模型生成（「整理记忆」）；记忆随对话进入下一轮的提示词；随时间衰减
- ✅ 点击神经元 → 「🧠 记忆」区查看它有权读到的记忆（带强度、可删除）
- ⏳ 下一步：涌现场景穷举、新人进入体验、群组记忆

## 运行

```bash
npm install     # 安装依赖
npm run dev     # 一键启动：前端(5173) + LLM 代理(8787)
```

打开 http://localhost:5173 → 右侧面板：

1. **模型设置**：选服务类型（OpenAI 兼容 / Ollama）、填 baseURL、API Key（Ollama 不需要）、模型名、温度；
2. **任务与运行**：填总任务、设轮数 → **▶ 开始对话**；
3. 左下角「信号记录」里能看到每个神经元真实的说的话（带关系与权重标注）。

生产模式：

```bash
npm run build   # 构建到 dist/
npm start       # 由代理服务器同时托管 dist/，访问 http://localhost:8787
```

## 在线访问（GitHub Pages）

仓库已内置自动部署工作流（`.github/workflows/pages.yml`）。只需一次设置：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**；
2. 之后每次 `git push` 都会自动构建并部署到 `https://<用户名>.github.io/together/`。

> ⚠️ 说明：Pages 是静态托管——**可视化全部可用**（拖拽、连线、状态光谱、时间轴）；但**真实 AI 对话需要本地代理**（`npm run dev`）。Pages 版点「开始对话」会给出清晰提示。以后要让在线版也能对话，需要把代理部署成后端服务，并配置 `VITE_API_URL`。

> 旧的三维原型保留在 `prototype.html`（无需构建，直接打开；依赖 CDN 加载 Three.js）。

## 目录结构

```
together/
├─ index.html          Vite 入口
├─ prototype.html      早期三维原型（单文件）
├─ PLAN.md             大纲与计划
├─ server/server.mjs   零依赖 LLM 代理（OpenAI 兼容 / Ollama 转发 + 生产静态托管）
├─ scripts/dev.mjs     一键开发启动（前端 + 代理）
├─ .github/workflows/  GitHub Pages 自动部署
├─ src/
│  ├─ core/            平台核心（纯 TS，与界面无关）
│  │  ├─ types.ts      神经元/边/消息/API 设置 类型
│  │  ├─ random.ts     可复现随机数
│  │  ├─ topology.ts   拓扑生成（位置/边）
│  │  ├─ activity.ts   系统状态光谱 + 放电波生成
│  │  ├─ llm.ts        LLM 客户端（经本地代理调用）
│  │  ├─ scheduler.ts  调度器：收信 → 标注元信息 → 交给模型 → 广播
│  │  └─ memory.ts     多层级发散记忆库（归属范围/衰减/推论）
│  ├─ state/store.ts   Zustand 全局状态（图、选中、连线、真实运行、记忆、持久化）
│  ├─ three/           3D 场景（React Three Fiber）
│  │  ├─ Scene.tsx     白空间 + 灯光 + 相机
│  │  ├─ Neuron.tsx    神经元（点击/拖拽/点亮）
│  │  ├─ Link.tsx      连接（曲线管道 + 信号光点）
│  │  └─ glow.ts       颜色与柔光贴图
│  └─ ui/              面板（控制 / 任务运行 / 模型设置 / 神经元 / 连接 / 时间轴 / 信号记录）
```

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **3D**：Three.js + @react-three/fiber + @react-three/drei
- **状态**：Zustand（API 配置持久化到 localStorage）
- **代理**：Node 原生 http 服务器（零依赖），转发 OpenAI 兼容接口 / Ollama
- 核心逻辑（`src/core`）与渲染解耦，后续接多层级记忆库与场景穷举时直接复用。

## 常见问题

- **连不上模型**：确认代理在跑（`npm run dev` 会一起启动）；Ollama 需先 `ollama pull <模型名>`；
- **GitHub Pages 静态部署**：可视化可看，但真实对话需要本地代理（或以后部署后端）。
