import { useStore } from '../state/store';
import type { Message } from '../core/types';

export function MessageLog() {
  const round = useStore((s) => s.round);
  const messagesByRound = useStore((s) => s.messagesByRound);

  const flat: Message[] = [];
  for (let r = 0; r <= round && r < messagesByRound.length; r++) {
    flat.push(...messagesByRound[r]);
  }
  const shown = flat.slice(-120);

  return (
    <div className="log panel">
      <div className="panel-head">
        <h3>信号记录（模拟）· 截至第 {round + 1} 轮</h3>
      </div>
      <div className="log-body">
        {shown.length === 0 && <div className="empty">当前轮无信号</div>}
        {shown.map((m) => (
          <div key={m.id} className="msg">
            <span className="r">#{m.round + 1}</span>
            <span className="tag">{m.relationType}</span>
            <span className="txt">{m.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
