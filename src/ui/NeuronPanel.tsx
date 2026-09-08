import { useStore } from '../state/store';

export function NeuronPanel() {
  const neuron = useStore((s) => s.neurons.find((n) => n.id === s.selectedNeuronId));
  const updateNeuron = useStore((s) => s.updateNeuron);
  const removeNeuron = useStore((s) => s.removeNeuron);
  const deselectAll = useStore((s) => s.deselectAll);

  if (!neuron) return null;

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

      <div className="note">
        记忆原则：个人记忆仅自己可读；共同记忆双方可读；平台指示模型记录、记录持久化。（下一步接入）
      </div>

      <button className="btn danger" onClick={() => removeNeuron(neuron.id)}>
        删除神经元
      </button>
    </div>
  );
}
