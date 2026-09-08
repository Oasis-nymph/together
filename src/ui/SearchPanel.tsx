import { useState } from 'react';
import { useStore } from '../state/store';
import { SCENARIO_TEMPLATES } from '../core/scenarios';

export function SearchPanel() {
  const searchRunning = useStore((s) => s.searchRunning);
  const searchProgress = useStore((s) => s.searchProgress);
  const searchResults = useStore((s) => s.searchResults);
  const searchError = useStore((s) => s.searchError);
  const startSearch = useStore((s) => s.startSearch);
  const stopSearch = useStore((s) => s.stopSearch);
  const loadScenarioResult = useStore((s) => s.loadScenarioResult);
  const viewScenarioResult = useStore((s) => s.viewScenarioResult);

  const [tplId, setTplId] = useState('lab');
  const [variants, setVariants] = useState(4);
  const [rounds, setRounds] = useState(3);

  const tpl = SCENARIO_TEMPLATES.find((t) => t.id === tplId);
  const budgetCalls = (tpl?.count ?? 0) * variants * rounds;

  return (
    <div className="panel">
      <h3>涌现场景穷举</h3>
      <div className="note">
        涌现无法被命令，只能被搜索：自动生成场景变体（角色轮转 × 状态光谱 × 拓扑 × 风格），批量运行并按涌现分排名。
      </div>

      <div className="field">
        <label>场景模板</label>
        <select value={tplId} onChange={(e) => setTplId(e.target.value)} disabled={searchRunning}>
          {SCENARIO_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="lbl">
          <span>变体数（上限自定义）</span>
          <b>{variants}</b>
        </div>
        <input
          type="range"
          min={2}
          max={8}
          step={1}
          value={variants}
          disabled={searchRunning}
          onChange={(e) => setVariants(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="field">
        <div className="lbl">
          <span>每场景轮数</span>
          <b>{rounds}</b>
        </div>
        <input
          type="range"
          min={2}
          max={6}
          step={1}
          value={rounds}
          disabled={searchRunning}
          onChange={(e) => setRounds(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="tiny">预算：约 {budgetCalls} 次模型调用（≈ {budgetCalls * 0.8}k tokens 量级）· 场景并行（并发数同「任务与运行」）</div>

      {searchError && <div className="run-error">{searchError}</div>}

      {searchRunning ? (
        <>
          <div className="run-status">
            搜索中 {searchProgress ? `${searchProgress.current + 1} / ${searchProgress.total}` : ''}
          </div>
          <button className="btn danger" onClick={stopSearch}>
            ⏹ 停止
          </button>
        </>
      ) : (
        <button className="btn" onClick={() => startSearch({ templateId: tplId, variants, rounds })}>
          ▶ 开始穷举
        </button>
      )}

      {searchResults.length > 0 && (
        <div className="results">
          <div className="subhead">涌现排名</div>
          {searchResults.slice(0, 8).map((r, i) => (
            <div key={r.variant.id} className={`result${i === 0 ? ' top' : ''}`}>
              <div className="result-head">
                <span className="result-rank">{i + 1}</span>
                <span className="result-name">{r.variant.name}</span>
                <span className="result-score">{r.metrics.score}</span>
              </div>
              <div className="result-desc">{r.variant.description}</div>
              <div className="result-sum">💬 {r.summary}</div>
              <div className="result-actions">
                <button className="mini" onClick={() => loadScenarioResult(r)}>
                  载入画布
                </button>
                <button className="mini" onClick={() => viewScenarioResult(r)}>
                  查看对话
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
