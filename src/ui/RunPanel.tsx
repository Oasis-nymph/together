import { useStore } from '../state/store';
import { BENCH_TASKS } from '../core/bench';

export function RunPanel() {
  const task = useStore((s) => s.task);
  const runRounds = useStore((s) => s.runRounds);
  const runKeypoints = useStore((s) => s.runKeypoints);
  const settings = useStore((s) => s.settings);
  const running = useStore((s) => s.running);
  const runRound = useStore((s) => s.runRound);
  const runError = useStore((s) => s.runError);
  const setTask = useStore((s) => s.setTask);
  const setRunKeypoints = useStore((s) => s.setRunKeypoints);
  const setRunRounds = useStore((s) => s.setRunRounds);
  const setSettings = useStore((s) => s.setSettings);
  const startRun = useStore((s) => s.startRun);
  const stopRun = useStore((s) => s.stopRun);

  return (
    <div className="panel">
      <h3>任务与运行</h3>

      <div className="field">
        <label>预设任务（带关键点，供裁判打分）</label>
        <select
          defaultValue=""
          onChange={(e) => {
            const t = BENCH_TASKS.find((x) => x.id === e.target.value);
            if (t) {
              setTask(t.task);
              setRunKeypoints(t.keypoints);
            }
            e.target.value = '';
          }}
        >
          <option value="">— 载入一个 —</option>
          {BENCH_TASKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {runKeypoints.length > 0 && (
          <div className="tiny">裁判将按 {runKeypoints.length} 个关键点打任务完成度分。</div>
        )}
      </div>

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

      <div className="field">
        <div className="lbl">
          <span>并发（同时说话的神经元数）</span>
          <b>{settings.concurrency}</b>
        </div>
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={settings.concurrency}
          onChange={(e) => setSettings({ concurrency: parseInt(e.target.value, 10) })}
        />
        <div className="tiny">越大越快，但太高可能被服务商限流（已配自动重试）。</div>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.autoDistill}
          onChange={(e) => setSettings({ autoDistill: e.target.checked })}
        />
        跑完自动整理记忆（最活跃的神经元生成推论记忆）
      </label>

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
