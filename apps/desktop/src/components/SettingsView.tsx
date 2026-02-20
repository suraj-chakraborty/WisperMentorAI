
import React, { useState, useEffect } from 'react';
import './SettingsView.css';

import { useAuth } from '../context/AuthContext';

// API base url
const API_URL = 'http://127.0.0.1:3001';

export const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<any>({
        llm: {
            provider: 'ollama',
            apiKey: '',
            model: '',
        },
        lingo: {
            apiKey: '',
            preferredLanguage: 'es'
        },
        offlineMode: false
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const { token } = useAuth();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Only update if there's relevant data
                if (data.llm || data.lingo || data.offlineMode !== undefined) {
                    setSettings((prevSettings: any) => ({
                        ...prevSettings,
                        llm: { ...prevSettings.llm, ...(data.llm || {}) },
                        lingo: { ...prevSettings.lingo, ...(data.lingo || {}) },
                        offlineMode: data.offlineMode !== undefined ? data.offlineMode : prevSettings.offlineMode
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMsg('');
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    llm: settings.llm,
                    lingo: settings.lingo,
                    offlineMode: settings.offlineMode
                })
            });

            if (res.ok) {
                setMsg('Settings saved successfully!');
            } else {
                setMsg('Failed to save settings.');
            }
        } catch (error) {
            setMsg('Error saving settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-view">
            <header className="settings__header">
                <h2 className="settings__title">
                    Settings & Configuration
                </h2>
                <p className="settings__subtitle">Manage your AI brain and application preferences</p>
            </header>

            <div className="settings__card">
                <div className="settings__section-title">
                    <div className="settings__icon-box">
                        🧠
                    </div>
                    <div className="settings__section-info">
                        <h3>AI Provider</h3>
                        <p>Choose the brain that powers your mentor</p>
                    </div>
                </div>

                <div className="settings__form">
                    {/* Offline Mode Toggle */}
                    <div className="settings__field" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <label className="settings__label" style={{ marginBottom: '4px' }}>Offline Mode</label>
                                <p className="settings__hint" style={{ margin: 0 }}>
                                    Force local processing only (uses Ollama). No data leaves your device.
                                </p>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={settings.offlineMode || false}
                                    onChange={(e) => setSettings({ ...settings, offlineMode: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                    {/* Provider Select */}
                    <div className="settings__field">
                        <label className="settings__label">Select Provider</label>
                        <div className="settings__input-group">
                            <select
                                className="settings__select"
                                value={settings.llm.provider}
                                onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, provider: e.target.value } })}
                            >
                                <option value="ollama">🦙 Ollama (Local & Private)</option>
                                <option value="openai">🤖 OpenAI (GPT-4 / GPT-3.5)</option>
                                <option value="anthropic">🧠 Anthropic (Claude 3)</option>
                                <option value="gemini">✨ Google Gemini</option>
                                <option value="openrouter">🌐 OpenRouter (Various Models)</option>
                            </select>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div className="settings__field" style={{ opacity: settings.llm.provider === 'ollama' ? 0.5 : 1 }}>
                        <label className="settings__label">
                            <span>API Key</span>
                            {settings.llm.apiKey && settings.llm.apiKey.includes('***') && (
                                <span className="settings__secure-badge">
                                    ✓ Securely saved
                                </span>
                            )}
                        </label>
                        <div className="settings__input-group">
                            <input
                                type="password"
                                placeholder={settings.llm.provider === 'ollama' ? 'Not required for local models' : 'sk-................'}
                                className="settings__input"
                                value={settings.llm.apiKey}
                                onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, apiKey: e.target.value } })}
                                disabled={settings.llm.provider === 'ollama'}
                            />
                        </div>
                    </div>

                    {/* Model Name Input */}
                    <div className="settings__field">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-300">Model Name (Optional)</label>
                            <input
                                type="text"
                                value={settings.llm.model}
                                onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, model: e.target.value } })}
                                placeholder="e.g. llama3, gpt-4-turbo"
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <p className="settings__hint">Leave empty to use the provider's default model.</p>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🌍 Localization (Lingo.dev)
                    </h3>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-300">Lingo.dev API Key (Optional)</label>
                        <input
                            type="password"
                            value={settings.lingo?.apiKey || ''}
                            onChange={(e) => setSettings({ ...settings, lingo: { ...settings.lingo, apiKey: e.target.value } })}
                            placeholder="sk-..."
                            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-slate-500">
                            Leave blank to use LLM fallback for translation.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        <label className="text-sm font-medium text-slate-300">Default Target Language</label>
                        <div className="settings__input-group">
                            <select
                                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                value={settings.lingo?.preferredLanguage || 'es'}
                                onChange={(e) => setSettings({ ...settings, lingo: { ...settings.lingo, preferredLanguage: e.target.value } })}
                            >
                                <option value="en">English (English)</option>
                                <option value="es">Spanish (Español)</option>
                                <option value="fr">French (Français)</option>
                                <option value="de">German (Deutsch)</option>
                                <option value="zh">Chinese (中文)</option>
                                <option value="ja">Japanese (日本語)</option>
                                <option value="pt">Portuguese (Português)</option>
                                <option value="it">Italian (Italiano)</option>
                                <option value="ru">Russian (Русский)</option>
                                <option value="hi">Hindi (हिंदी)</option>
                                <option value="ko">Korean (한국어)</option>
                                <option value="nl">Dutch (Nederlands)</option>
                                <option value="tr">Turkish (Türkçe)</option>
                                <option value="pl">Polish (Polski)</option>
                                <option value="sv">Swedish (Svenska)</option>
                            </select>
                        </div>
                    </div>
                </div>
                {/* Save Section */}
                <div className="settings__footer">
                    <div className="settings__status">
                        {msg && (
                            <span className={msg.includes('success') ? 'settings__status--success' : 'settings__status--error'}>
                                {msg.includes('success') ? '✅' : '⚠️'} {msg}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="settings__btn-save"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="settings__note">
                <span className="settings__note-icon">💡</span>
                <p className="settings__note-text">
                    Note: If switching providers, you may need to restart the backend services for connection pools to reset.
                    Your API keys are stored securely on your local device.
                </p>
            </div>
        </div>
    );
};
