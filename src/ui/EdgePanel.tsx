import { useStore } from '../state/store';
import { RELATION_TYPES } from '../core/types';
import type { Direction } from '../core/types';

export function EdgePanel() {
  const edge = useStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  const neurons = useStore((s) => s.neurons);
  const updateEdge = useStore((s) => s.updateEdge);
  const removeEdge = useStore((s) => s.removeEdge);
  const deselectAll = useStore((s) => s.deselectAll);

  if (!edge) return null;

  const from = neurons.find((n) => n.id === edge.source);
  const to = neurons.find((n) => n.id === edge.target);

  return (
    <div className="panel panel-left">
      <div className="panel-head">
        <h3>连接（关系）</h3>
        <button className="close" onClick={deselectAll}>
          ×
        </button>
      </div>

      <div className="rel">
        {from?.name ?? '?'} ⇄ {to?.name ?? '?'}
      </div>

      <div className="field">
        <label>关系类型</label>
        <select
          value={edge.relationType}
          onChange={(e) => updateEdge(edge.id, { relationType: e.target.value })}
        >
          {RELATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>方向</label>
        <select
          value={edge.direction}
          onChange={(e) => updateEdge(edge.id, { direction: e.target.value as Direction })}
        >
          <option value="both">双向</option>
          <option value="forward">
            {from?.name ?? 'A'} → {to?.name ?? 'B'}
          </option>
          <option value="backward">
            {from?.name ?? 'A'} ← {to?.name ?? 'B'}
          </option>
        </select>
      </div>

      <div className="field">
        <div className="lbl">
          <span>权重</span>
          <b>{edge.weight.toFixed(2)}</b>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={edge.weight}
          onChange={(e) => updateEdge(edge.id, { weight: parseFloat(e.target.value) })}
        />
        <div className="note">权重只是给模型的先验提示；如何取舍由模型自己判断。</div>
      </div>

      <button className="btn danger" onClick={() => removeEdge(edge.id)}>
        删除连接
      </button>
    </div>
  );
}
