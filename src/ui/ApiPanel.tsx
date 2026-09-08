import { useState } from 'react';
import { useStore } from '../state/store';
import { OPENAI_DEFAULT_URL, OLLAMA_DEFAULT_URL } from '../core/types';

export function ApiPanel() {
  const api = useStore((s) => s.api);
  const setApi = useStore((s) => s.setApi);
  const modelProfiles = useStore((s) => s.modelProfiles);
  const addModelProfile = useStore((s) => s.addModelProfile);
  const updateModelProfile = useStore((s) => s.updateModelProfile);
  const removeModelProfile = useStore((s) => s.removeModelProfile);

  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<'openai' | 'ollama'>('openai');
  const [newModel, setNewModel] = useState('');

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
        <label>全局模型（未指定的神经元用这个）</label>
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

      <div className="divider" />

      <h3>模型库（不同神经元可用不同 AI）</h3>
      {modelProfiles.length === 0 && (
        <div className="tiny">还没有自定义模型。添加后，可在神经元面板里给每个神经元指定不同的 AI。</div>
      )}
      {modelProfiles.map((p) => (
        <div key={p.id} className="profile">
          <div className="profile-row">
            <input
              className="p-name"
              value={p.name}
              placeholder="名字，如 GPT / DeepSeek / 本地Qwen"
              onChange={(e) => updateModelProfile(p.id, { name: e.target.value })}
            />
            <select
              value={p.provider}
              onChange={(e) => updateModelProfile(p.id, { provider: e.target.value as 'openai' | 'ollama' })}
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="ollama">Ollama</option>
            </select>
            <span className="mem-x" onClick={() => removeModelProfile(p.id)}>
              ✕
            </span>
          </div>
          <input
            className="p-model"
            value={p.model}
            placeholder="模型名，如 deepseek-chat / qwen2.5:7b"
            onChange={(e) => updateModelProfile(p.id, { model: e.target.value })}
          />
          <input
            className="p-url"
            value={p.baseURL}
            placeholder={p.provider === 'ollama' ? OLLAMA_DEFAULT_URL : OPENAI_DEFAULT_URL}
            onChange={(e) => updateModelProfile(p.id, { baseURL: e.target.value })}
          />
          {p.provider === 'openai' && (
            <input
              className="p-key"
              type="password"
              value={p.apiKey}
              placeholder="API Key（该模型专用）"
              onChange={(e) => updateModelProfile(p.id, { apiKey: e.target.value })}
            />
          )}
        </div>
      ))}
      <div className="profile-add">
        <input
          placeholder="名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as 'openai' | 'ollama')}>
          <option value="openai">OpenAI 兼容</option>
          <option value="ollama">Ollama</option>
        </select>
        <input
          placeholder="模型名"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
        />
        <button
          className="mini"
          onClick={() => {
            if (!newName.trim() && !newModel.trim()) return;
            addModelProfile({
              name: newName.trim() || newModel.trim(),
              provider: newProvider,
              baseURL: newProvider === 'ollama' ? OLLAMA_DEFAULT_URL : OPENAI_DEFAULT_URL,
              apiKey: '',
              model: newModel.trim(),
            });
            setNewName('');
            setNewModel('');
          }}
        >
          ＋
        </button>
      </div>

      <div className="note">
        配置只保存在本地浏览器；请求经本地代理（:8787）转发给服务商，Key 不跨域暴露。
      </div>
    </div>
  );
}
