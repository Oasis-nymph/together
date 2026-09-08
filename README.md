# together

一个轻量、可玩、可回放、可嵌套的 **AI 集体系统科学观察平台**：把 AI 对话体当作神经元放进四维纯白空间（3D 空间 + 时间），用可定义关系的连线连接它们，让它们一对多/多对多地对话、记忆、演化，并观察是否有涌现行为。

完整设计与路线图见 [PLAN.md](./PLAN.md)。

## 当前状态：Phase 1 MVP

- ✅ 四维纯白空间：绿色神经元（胞体 + 内核 + 柔光）、弯曲连接、信号光点流动
- ✅ 点击神经元 → 编辑名称 / 角色（身份）/ 系统提示词
- ✅ 拖拽神经元移动；滚轮缩放、右键平移
- ✅ **连线模式**：依次点击两个神经元建立连接；点击连接 → 编辑关系类型（指令/批判/总结/投票/竞争/自定义）、方向（双向/单向）、权重
- ✅ 系统状态光谱：简单 / 有序 / 混沌边缘 / 混沌 / 无序 / 自定义（波动强度 + 噪声）
- ✅ 拓扑预设：分簇、环、星形、网格、小世界、全连接、随机 + 数量/密度
- ✅ 时间轴（第 4 维）：播放/暂停/拖动，放电波沿网络传播
- ✅ 信号记录（当前为**模拟信号**，等待接入真实 LLM）
- ⏳ 下一步：LLM 接入（消息聚合交给模型）、多层级记忆库、场景穷举

## 运行

```bash
npm install     # 安装依赖
npm run dev     # 开发模式（Vite，含热更新）
npm run build   # 生产构建
npm run preview # 预览构建产物
```

> 旧的三维原型保留在 `prototype.html`（无需构建，直接打开；依赖 CDN 加载 Three.js）。

## 目录结构

```
together/
├─ index.html          Vite 入口
├─ prototype.html      早期三维原型（单文件）
├─ PLAN.md             大纲与计划
├─ src/
│  ├─ core/            平台核心（纯 TS，与界面无关）
│  │  ├─ types.ts      神经元/边/消息/设置 类型
│  │  ├─ random.ts     可复现随机数
│  │  ├─ topology.ts   拓扑生成（位置/边）
│  │  └─ activity.ts   系统状态光谱 + 放电波生成
│  ├─ state/store.ts   Zustand 全局状态（图、选中、连线、模拟消息）
│  ├─ three/           3D 场景（React Three Fiber）
│  │  ├─ Scene.tsx     白空间 + 灯光 + 相机
│  │  ├─ Neuron.tsx    神经元（点击/拖拽/点亮）
│  │  ├─ Link.tsx      连接（曲线管道 + 信号光点）
│  │  └─ glow.ts       颜色与柔光贴图
│  └─ ui/              面板（控制 / 神经元 / 连接 / 时间轴 / 信号记录）
```

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **3D**：Three.js + @react-three/fiber + @react-three/drei
- **状态**：Zustand
- 核心逻辑（`src/core`）与渲染解耦，后续接 Node 后端与 LLM（OpenAI / Anthropic / 本地 Ollama）时直接复用。
