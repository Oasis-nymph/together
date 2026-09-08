import { useStore } from '../state/store';

export function RunPanel() {
  const task = useStore((s) => s.task);
  const runRounds = useStore((s) => s.runRounds);
  const running = useStore((s) => s.running);
  const runRound = useStore((s) => s.runRound);
  const runError = useStore((s) => s.runError);
  const setTask = useStore((s) => s.setTask);
  const setRunRounds = useStore((s) => s.setRunRounds);
  const startRun = useStore((s) => s.startRun);
  const stopRun = useStore((s) => s.stopRun);

  return (
    <div className="panel">
      <h3>任务与运行</h3>

      <div className="field">
        <label>总任务（发给所有神经元）</label>
        <textarea
          rows={3}
          value={task}
          placeholder="例如：讨论合作如何产生，给出共同结论"
          onChange={(e) => setTask(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="lbl">
          <span>轮数</span>
          <b>{runRounds}</b>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={runRounds}
          onChange={(e) => setRunRounds(parseInt(e.target.value, 10))}
        />
      </div>

      {runError && <div className="run-error">{runError}</div>}

      {running ? (
        <>
          <div className="run-status">
            运行中 · 第 {runRound} / {runRounds} 轮
          </div>
          <button className="btn danger" onClick={stopRun}>
            ⏹ 停止
          </button>
        </>
      ) : (
        <button className="btn" onClick={startRun}>
          ▶ 开始对话（真实模型）
        </button>
      )}

      <div className="note">
        平台只收集消息并标注元信息（来自谁 / 关系 / 权重）；如何取舍由每个神经元自己的模型判断。
      </div>
    </div>
  );
}
