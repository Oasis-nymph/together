import { Scene } from './three/Scene';
import { ControlPanel } from './ui/ControlPanel';
import { RunPanel } from './ui/RunPanel';
import { EmergencePanel } from './ui/EmergencePanel';
import { ApiPanel } from './ui/ApiPanel';
import { NeuronPanel } from './ui/NeuronPanel';
import { EdgePanel } from './ui/EdgePanel';
import { TimeBar } from './ui/TimeBar';
import { MessageLog } from './ui/MessageLog';
import { useStore } from './state/store';

export default function App() {
  const selectedNeuronId = useStore((s) => s.selectedNeuronId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const connectMode = useStore((s) => s.connectMode);
  const connectFromId = useStore((s) => s.connectFromId);

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Scene />
      </div>
      <div className="ui">
        <div className="top-left">
          <div className="brand">
            together<span className="dot">.</span>
          </div>
          <div className="tag">四维纯白空间 · AI 神经元 · Phase 1</div>
        </div>

        <div className={`hint${connectMode ? ' hint-on' : ''}`}>
          {connectMode
            ? connectFromId
              ? '连线模式：点击第二个神经元建立关系'
              : '连线模式：点击第一个神经元'
            : '拖拽神经元移动 · 点击选中 · 滚轮缩放 · 右键平移'}
        </div>

        <div className="col-right">
          <ControlPanel />
          <RunPanel />
          <EmergencePanel />
          <ApiPanel />
        </div>
        {selectedNeuronId && <NeuronPanel />}
        {selectedEdgeId && <EdgePanel />}
        <TimeBar />
        <MessageLog />
      </div>
    </div>
  );
}
