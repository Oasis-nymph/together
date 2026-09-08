import { useStore } from '../state/store';
import { computeMetrics, interpret } from '../core/emergence';
import type { EmergenceMetrics } from '../core/emergence';

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <div className="metric-track">
        <div className="metric-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="metric-val">{(value * 100).toFixed(0)}</span>
    </div>
  );
}

export function EmergencePanel() {
  const runs = useStore((s) => s.runs);
  const running = useStore((s) => s.running);
  const liveMessages = useStore((s) => s.runMessages);
  const neurons = useStore((s) => s.neurons);
  const clearRuns = useStore((s) => s.clearRuns);

  const metrics: EmergenceMetrics | null = running
    ? computeMetrics(liveMessages, neurons.length)
    : runs[0]?.metrics ?? null;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>涌现观察</h3>
        {runs.length > 0 && (
          <button className="mini-ghost" onClick={clearRuns} title="清空运行历史">
            清空
          </button>
        )}
      </div>

      {!metrics ? (
        <div className="note">
          还没有运行记录。点「任务与运行」里的 ▶ 开始对话，结束后这里会自动计算涌现指标——观察的是全局量：参与度、共识、新颖性、分工。
        </div>
      ) : (
        <>
          <div className="score-row">
            <div className="score-big">{metrics.score}</div>
            <div className="score-side">
              <div className="score-name">综合涌现分</div>
              <div className="score-counts">
                {metrics.speakerCount}/{metrics.totalNeurons} 个神经元发言 · {metrics.messageCount} 条消息
              </div>
            </div>
          </div>
          <Bar label="参与度" value={metrics.participation} />
          <Bar label="共识度" value={metrics.consensus} />
          <Bar label="新颖性" value={metrics.novelty} />
          <Bar label="发言均匀（分工）" value={metrics.roleEntropy} />
          <Bar label="关系多样性" value={metrics.relationDiversity} />
          <div className="note interpret">{interpret(metrics)}</div>
        </>
      )}
    </div>
  );
}
