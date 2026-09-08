import { useStore } from '../state/store';
import { OPENAI_DEFAULT_URL, OLLAMA_DEFAULT_URL } from '../core/types';

export function ApiPanel() {
  const api = useStore((s) => s.api);
  const setApi = useStore((s) => s.setApi);

  const changeProvider = (p: 'openai' | 'ollama') => {
    const patch: { provider: 'openai' | 'ollama'; baseURL?: string } = { provider: p };
    if (p === 'ollama' && (!api.baseURL || api.baseURL === OPENAI_DEFAULT_URL)) {
      patch.baseURL = OLLAMA_DEFAULT_URL;
    } else if (p === 'openai' && (!api.baseURL || api.baseURL === OLLAMA_DEFAULT_URL)) {
      patch.baseURL = OPENAI_DEFAULT_URL;
    }
    setApi(patch);
  };

  return (
    <div className="panel">
      <h3>模型设置（API）</h3>

      <div className="field">
        <label>服务类型</label>
        <select value={api.provider} onChange={(e) => changeProvider(e.target.value as 'openai' | 'ollama')}>
          <option value="openai">OpenAI 兼容接口</option>
          <option value="ollama">Ollama（本地）</option>
        </select>
      </div>

      <div className="field">
        <label>接口地址 baseURL</label>
        <input
          value={api.baseURL}
          placeholder={api.provider === 'ollama' ? OLLAMA_DEFAULT_URL : OPENAI_DEFAULT_URL}
          onChange={(e) => setApi({ baseURL: e.target.value })}
        />
        <div className="tiny">
          {api.provider === 'openai'
            ? 'DeepSeek: https://api.deepseek.com/v1 · 通义: https://dashscope.aliyuncs.com/compatible-mode/v1'
            : '本地 Ollama 默认 http://localhost:11434'}
        </div>
      </div>

      {api.provider === 'openai' && (
        <div className="field">
          <label>API Key</label>
          <input
            type="password"
            value={api.apiKey}
            placeholder="sk-…"
            onChange={(e) => setApi({ apiKey: e.target.value })}
          />
        </div>
      )}

      <div className="field">
        <label>模型名</label>
        <input
          value={api.model}
          placeholder={api.provider === 'ollama' ? 'qwen2.5:7b / llama3.1' : 'gpt-4o-mini / deepseek-chat'}
          onChange={(e) => setApi({ model: e.target.value })}
        />
      </div>

      <div className="field">
        <div className="lbl">
          <span>温度</span>
          <b>{api.temperature.toFixed(2)}</b>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={api.temperature}
          onChange={(e) => setApi({ temperature: parseFloat(e.target.value) })}
        />
      </div>

      <div className="note">
        配置只保存在本地浏览器；请求经本地代理（:8787）转发给服务商，Key 不跨域暴露。
      </div>
    </div>
  );
}
