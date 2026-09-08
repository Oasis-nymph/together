import { useEffect } from 'react';
import { useStore } from '../state/store';
import { ROUNDS } from '../core/types';

export function TimeBar() {
  const round = useStore((s) => s.round);
  const playing = useStore((s) => s.playing);
  const setRound = useStore((s) => s.setRound);
  const setPlaying = useStore((s) => s.setPlaying);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setRound(useStore.getState().round + 1);
    }, 420);
    return () => clearInterval(t);
  }, [playing, setRound]);

  return (
    <div className="timebar">
      <button onClick={() => setPlaying(!playing)} title="播放/暂停">
        {playing ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={ROUNDS - 1}
        value={round}
        onChange={(e) => setRound(parseInt(e.target.value, 10))}
      />
      <div className="round">
        第 {round + 1} / {ROUNDS} 轮
      </div>
    </div>
  );
}
