import { useStore } from '../state/store';
import { REGIME_OPTIONS, TOPOLOGY_OPTIONS } from '../core/types';

export function ControlPanel() {
  const settings = useStore((s) => s.settings);
  const connectMode = useStore((s) => s.connectMode);
  const connectFromId = useStore((s) => s.connectFromId);
  const setSettings = useStore((s) => s.setSettings);
  const rebuild = useStore((s) => s.rebuild);
  const addNeuron = useStore((s) => s.addNeuron);
  const setConnectMode = useStore((s) => s.setConnectMode);

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
