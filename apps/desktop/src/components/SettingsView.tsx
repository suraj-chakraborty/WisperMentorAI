
import React, { useState, useEffect } from 'react';
import './SettingsView.css';

// API base url
const API_URL = 'http://localhost:3001';
const USER_ID = 'demo-user'; // Hackathon mode

export const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<any>({
        llm: {
            provider: 'ollama',
            apiKey: '',
            model: '',
        },
        offlineMode: false
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/settings`, {
                headers: { 'x-user-id': USER_ID }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.llm) {
                    setSettings({
                        ...settings,
                        llm: { ...settings.llm, ...data.llm },
                        offlineMode: data.offlineMode || false
                    });
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
                    'x-user-id': USER_ID
                },
                body: JSON.stringify({ llm: settings.llm, offlineMode: settings.offlineMode })
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
                        <label className="settings__label">
                            Model Name <span style={{ fontWeight: 'normal', opacity: 0.6 }}>(Optional)</span>
                        </label>
                        <div className="settings__input-group">
                            <input
                                type="text"
                                placeholder="e.g. gpt-4-turbo, claude-3-opus, llama3"
                                className="settings__input"
                                value={settings.llm.model}
                                onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, model: e.target.value } })}
                            />
                        </div>
                        <p className="settings__hint">Leave empty to use the provider's default model.</p>
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
