import { useStore } from '../state/store';
import { decayedStrength, readableMemories } from '../core/memory';

export function NeuronPanel() {
  const neuron = useStore((s) => s.neurons.find((n) => n.id === s.selectedNeuronId));
  const updateNeuron = useStore((s) => s.updateNeuron);
  const removeNeuron = useStore((s) => s.removeNeuron);
  const deselectAll = useStore((s) => s.deselectAll);
  const memories = useStore((s) => s.memories);
  const distilling = useStore((s) => s.distilling);
  const distillMemory = useStore((s) => s.distillMemory);
  const removeMemory = useStore((s) => s.removeMemory);

  if (!neuron) return null;

  const readable = readableMemories(memories, neuron.id).slice(0, 20);
  const total = readableMemories(memories, neuron.id).length;

  return (
    <div className="panel panel-left">
      <div className="panel-head">
        <h3>神经元</h3>
        <button className="close" onClick={deselectAll}>
          ×
        </button>
      </div>

      <div className="field">
        <label>名称</label>
        <input
          value={neuron.name}
          onChange={(e) => updateNeuron(neuron.id, { name: e.target.value })}
        />
      </div>

      <div className="field">
        <label>角色（身份）</label>
        <textarea
          rows={2}
          value={neuron.role}
          placeholder="例如：怀疑论者、仲裁人、记录员…"
          onChange={(e) => updateNeuron(neuron.id, { role: e.target.value })}
        />
      </div>

      <div className="field">
        <label>系统提示词</label>
        <textarea
          rows={5}
          value={neuron.systemPrompt}
          placeholder="告诉这个 AI：你是谁、如何回应、要记录什么…"
          onChange={(e) => updateNeuron(neuron.id, { systemPrompt: e.target.value })}
        />
      </div>

      <div className="mem-section">
        <div className="mem-head">
          <span className="mem-title">🧠 记忆（{total} 条可读）</span>
          <button
            className="mini"
            onClick={() => distillMemory(neuron.id)}
            disabled={!!distilling}
          >
            {distilling === neuron.id ? '整理中…' : '整理记忆'}
          </button>
        </div>
        {readable.length === 0 && (
          <div className="tiny">
            还没有记忆。运行对话后事件会自动记录；点「整理记忆」让这个 AI 自己提炼推论记忆。
          </div>
        )}
        {readable.map((m) => (
          <div key={m.id} className="mem">
            <div className="mem-meta">
              <span className={`badge ${m.level}`}>{m.level === 'shared' ? '共同' : '个人'}</span>
              <span className={`badge ${m.type}`}>{m.type === 'inference' ? '推论' : '事件'}</span>
              <span className="mem-strength">强度 {decayedStrength(m).toFixed(2)}</span>
              <span className="mem-x" onClick={() => removeMemory(m.id)}>
                ✕
              </span>
            </div>
            <div className="mem-txt">{m.content}</div>
          </div>
        ))}
        <div className="note">
          归属范围：个人记忆仅自己可读；共同记忆双方可读。事件由平台自动记录；推论由模型生成；记忆随时间衰减。
        </div>
      </div>

      <button className="btn danger" onClick={() => removeNeuron(neuron.id)}>
        删除神经元
      </button>
    </div>
  );
}
