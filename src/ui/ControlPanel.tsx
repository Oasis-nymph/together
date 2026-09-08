import { useState } from 'react';
import { useStore } from '../state/store';
import { REGIME_OPTIONS, TOPOLOGY_OPTIONS } from '../core/types';
import { SCENARIO_TEMPLATES } from '../core/scenarios';

export function ControlPanel() {
  const settings = useStore((s) => s.settings);
  const connectMode = useStore((s) => s.connectMode);
  const connectFromId = useStore((s) => s.connectFromId);
  const setSettings = useStore((s) => s.setSettings);
  const rebuild = useStore((s) => s.rebuild);
  const addNeuron = useStore((s) => s.addNeuron);
  const setConnectMode = useStore((s) => s.setConnectMode);
  const loadTemplate = useStore((s) => s.loadTemplate);
  const groups = useStore((s) => s.groups);
  const addGroup = useStore((s) => s.addGroup);
  const renameGroup = useStore((s) => s.renameGroup);
  const setGroupParent = useStore((s) => s.setGroupParent);
  const removeGroup = useStore((s) => s.removeGroup);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParent, setNewGroupParent] = useState('');

  const rebuildOnRelease = () => rebuild();

  return (
    <div className="panel">
      <h3>系统 · 预设 / 自定义</h3>

      <div className="field">
        <div className="lbl">
          <span>系统状态</span>
        </div>
        <select
          value={settings.regime}
          onChange={(e) => {
            setSettings({ regime: e.target.value });
            rebuild();
          }}
        >
          {REGIME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {settings.regime === 'custom' && (
        <>
          <div className="field">
            <div className="lbl">
              <span>波动强度</span>
              <b>{settings.wave.toFixed(2)}</b>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.wave}
              onChange={(e) => setSettings({ wave: parseFloat(e.target.value) })}
              onPointerUp={rebuildOnRelease}
              onKeyUp={rebuildOnRelease}
            />
          </div>
          <div className="field">
            <div className="lbl">
              <span>噪声</span>
              <b>{settings.noise.toFixed(2)}</b>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.noise}
              onChange={(e) => setSettings({ noise: parseFloat(e.target.value) })}
              onPointerUp={rebuildOnRelease}
              onKeyUp={rebuildOnRelease}
            />
          </div>
        </>
      )}

      <div className="field">
        <div className="lbl">
          <span>连接方式</span>
        </div>
        <select
          value={settings.topology}
          onChange={(e) => {
            setSettings({ topology: e.target.value });
            rebuild();
          }}
        >
          {TOPOLOGY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="lbl">
          <span>神经元数量</span>
          <b>{settings.count}</b>
        </div>
        <input
          type="range"
          min={6}
          max={24}
          step={1}
          value={settings.count}
          onChange={(e) => setSettings({ count: parseInt(e.target.value, 10) })}
          onPointerUp={rebuildOnRelease}
          onKeyUp={rebuildOnRelease}
        />
      </div>

      <div className="field">
        <div className="lbl">
          <span>连接密度</span>
          <b>{settings.density.toFixed(2)}</b>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.density}
          onChange={(e) => setSettings({ density: parseFloat(e.target.value) })}
          onPointerUp={rebuildOnRelease}
          onKeyUp={rebuildOnRelease}
        />
      </div>

      <div className="field">
        <div className="lbl">
          <span>场景模板（角色社会）</span>
        </div>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) loadTemplate(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="">— 载入一个 —</option>
          {SCENARIO_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="lbl">
          <span>群组（可嵌套）</span>
        </div>
        <div className="group-list">
          {groups.length === 0 && <div className="tiny">还没有群组。群组记忆由全体成员可读。</div>}
          {groups.map((g) => (
            <div key={g.id} className="group-row">
              <span className="group-dot" style={{ background: g.color }} />
              <input
                className="group-name"
                value={g.name}
                onChange={(e) => renameGroup(g.id, e.target.value)}
              />
              <select
                className="group-parent"
                value={g.parentId ?? ''}
                onChange={(e) => setGroupParent(g.id, e.target.value || null)}
                title="父组（嵌套）"
              >
                <option value="">顶级</option>
                {groups
                  .filter((x) => x.id !== g.id)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
              <span className="group-count" title="成员数">
                {g.memberIds.length}
              </span>
              <span className="mem-x" onClick={() => removeGroup(g.id)}>
                ✕
              </span>
            </div>
          ))}
        </div>
        <div className="group-add">
          <input
            placeholder="新群组名"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <select value={newGroupParent} onChange={(e) => setNewGroupParent(e.target.value)}>
            <option value="">顶级</option>
            {groups.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <button
            className="mini"
            onClick={() => {
              addGroup(newGroupName, newGroupParent || null);
              setNewGroupName('');
            }}
          >
            ＋
          </button>
        </div>
        <div className="tiny">在神经元面板里把成员加入群组；个人记忆可「提升」为群组记忆。</div>
      </div>

      <button
        className={`btn${connectMode ? ' btn-on' : ''}`}
        onClick={() => setConnectMode(!connectMode)}
      >
        {connectMode
          ? connectFromId
            ? '连线中… 再点一个神经元'
            : '连线模式：点第一个神经元'
          : '🔗 连线模式'}
      </button>
      <button
        className="btn ghost"
        onClick={() =>
          addNeuron([(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3])
        }
      >
        ＋ 添加神经元
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          setSettings({ seed: Math.floor(Math.random() * 1e9) });
          rebuild();
        }}
      >
        随机重新生成
      </button>
    </div>
  );
}
