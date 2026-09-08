import { useState } from 'react';
import { useStore } from '../state/store';
import { decayedStrength } from '../core/memory';
import type { Memory } from '../core/memory';

const LEVEL_LABEL: Record<string, string> = {
  personal: '个人',
  shared: '共同',
  group: '群组',
};

export function MemoryPanel() {
  const memories = useStore((s) => s.memories);
  const neurons = useStore((s) => s.neurons);
  const [filter, setFilter] = useState<'all' | 'personal' | 'shared' | 'group'>('all');

  const nameOf = (id: string) => neurons.find((n) => n.id === id)?.name ?? id;
  const scopeLabel = (m: Memory) => m.scope.map(nameOf).join(' + ');

  const filtered = memories
    .filter((m) => filter === 'all' || m.level === filter)
    .sort((a, b) => decayedStrength(b) - decayedStrength(a))
    .slice(0, 60);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>🧠 记忆库（{memories.length} 条）</h3>
      </div>

      <select
        className="run-select"
        value={filter}
        onChange={(e) => setFilter(e.target.value as typeof filter)}
      >
        <option value="all">全部</option>
        <option value="personal">个人（仅本人可读）</option>
        <option value="shared">共同（双方可读）</option>
        <option value="group">群组（成员可读）</option>
      </select>

      {filtered.length === 0 && (
        <div className="tiny">
          还没有记忆。运行真实对话后事件会自动记录；点某个神经元 →「整理记忆」让模型生成推论记忆。
        </div>
      )}

      <div className="mem-list-global">
        {filtered.map((m) => (
          <div key={m.id} className="mem">
            <div className="mem-meta">
              <span className={`badge ${m.level}`}>{LEVEL_LABEL[m.level]}</span>
              <span className={`badge ${m.type}`}>{m.type === 'inference' ? '推论' : '事件'}</span>
              <span className="mem-strength">强度 {decayedStrength(m).toFixed(2)}</span>
            </div>
            <div className="mem-txt">{m.content}</div>
            <div className="mem-scope">可读：{scopeLabel(m)}</div>
          </div>
        ))}
      </div>

      <div className="note">
        归属范围读写：个人仅自己、共同双方、群组成员（含子组）可读。事件由平台自动记录；推论由该单位的模型生成；记忆随时间衰减。
      </div>
    </div>
  );
}
