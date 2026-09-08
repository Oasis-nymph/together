import { useStore } from '../state/store';
import type { Message } from '../core/types';

export function MessageLog() {
  const round = useStore((s) => s.round);
  const messagesByRound = useStore((s) => s.messagesByRound);
  const runMessages = useStore((s) => s.runMessages);
  const running = useStore((s) => s.running);
  const neurons = useStore((s) => s.neurons);

  const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;

  const flat: Message[] = [];
  for (let r = 0; r <= round && r < messagesByRound.length; r++) {
    flat.push(...messagesByRound[r]);
  }
  const shownSim = flat.slice(-60);
  const shownReal = runMessages.slice(-80);
  const clamp = (s: string, n = 120) => (s.length > n ? s.slice(0, n) + '…' : s);

  return (
    <div className="log panel">
      <div className="panel-head">
        <h3>信号记录</h3>
        {running && <span className="live">● 运行中</span>}
      </div>

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
