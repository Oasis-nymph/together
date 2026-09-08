import { useStore } from '../state/store';
import type { Message } from '../core/types';

export function MessageLog() {
  const round = useStore((s) => s.round);
  const messagesByRound = useStore((s) => s.messagesByRound);
  const running = useStore((s) => s.running);
  const liveMessages = useStore((s) => s.runMessages);
  const runs = useStore((s) => s.runs);
  const selectedRunId = useStore((s) => s.selectedRunId);
  const selectRun = useStore((s) => s.selectRun);
  const neurons = useStore((s) => s.neurons);

  const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;

  const selected = runs.find((r) => r.id === selectedRunId);
  const realMessages: Message[] = running
    ? liveMessages
    : selected
      ? selected.messages
      : runs[0]?.messages ?? [];

  const flat: Message[] = [];
  for (let r = 0; r <= round && r < messagesByRound.length; r++) {
    flat.push(...messagesByRound[r]);
  }
  const shownSim = flat.slice(-60);
  const shownReal = realMessages.slice(-80);
  const clamp = (s: string, n = 120) => (s.length > n ? s.slice(0, n) + '…' : s);

  const fmtTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="log panel">
      <div className="panel-head">
        <h3>信号记录</h3>
        {running && <span className="live">● 运行中</span>}
      </div>

      {runs.length > 0 && !running && (
        <select
          className="run-select"
          value={selectedRunId ?? runs[0].id}
          onChange={(e) => selectRun(e.target.value || null)}
        >
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              运行 {fmtTime(r.at)} · {r.metrics.score} 分 · {r.messages.length} 条消息
            </option>
          ))}
        </select>
      )}

      {shownReal.length > 0 && (
        <>
          <div className="subhead">真实对话（最近 {shownReal.length} 条）</div>
          <div className="log-body real">
            {shownReal.map((m) => (
              <div key={m.id} className="msg">
                <span className="r">R{m.round + 1}</span>
                <span className={`tag${m.relationType === '错误' ? ' tag-err' : ''}`}>{m.relationType}</span>
                <span className="txt">
                  <b>{nameOf(m.fromId)}</b>
                  {m.toId ? ` → ${nameOf(m.toId)}` : ''}：{clamp(m.content)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="subhead">模拟信号 · 第 {round + 1} 轮（未接模型时的演示）</div>
      <div className="log-body">
        {shownSim.length === 0 && <div className="empty">当前轮无信号</div>}
        {shownSim.map((m) => (
          <div key={m.id} className="msg">
            <span className="r">#{m.round + 1}</span>
            <span className="tag">{m.relationType}</span>
            <span className="txt">{clamp(m.content)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
