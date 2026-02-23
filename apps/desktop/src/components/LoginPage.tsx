import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC<{ onSwitchToSignup: () => void }> = ({ onSwitchToSignup }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Animated background orbs */}
            <div className="auth-bg">
                <div className="auth-bg__orb auth-bg__orb--1" />
                <div className="auth-bg__orb auth-bg__orb--2" />
                <div className="auth-bg__orb auth-bg__orb--3" />
            </div>

            <div className="auth-layout">
                {/* Left Hero Panel */}
                <div className="auth-hero">
                    <div className="auth-hero__content">
                        <img className='auth-hero__logo' width={180} height={100} src="../../public/logo.png" alt="Logo" />
                        <h1 className="auth-hero__title">WisperMentorAI</h1>
                        <p className="auth-hero__tagline">
                            Your AI-powered mentor for real-time learning and knowledge capture
                        </p>
                        <div className="auth-hero__features">
                            <div className="auth-hero__feature">
                                <span className="auth-hero__feature-icon">🎙️</span>
                                <span>Real-time transcription</span>
                            </div>
                            <div className="auth-hero__feature">
                                <span className="auth-hero__feature-icon">🧠</span>
                                <span>AI-powered insights</span>
                            </div>
                            <div className="auth-hero__feature">
                                <span className="auth-hero__feature-icon">📊</span>
                                <span>Knowledge graphs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className="auth-form-panel">
                    <div className="auth-card">
                        <div className="auth-card__header">
                            <h2 className="auth-card__title">Welcome back</h2>
                            <p className="auth-card__subtitle">Sign in to continue your learning journey</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-field">
                                <label className="auth-field__label" htmlFor="login-email">Email</label>
                                <div className="auth-field__input-wrap">
                                    <span className="auth-field__icon">✉️</span>
                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="auth-field__input"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label className="auth-field__label" htmlFor="login-password">Password</label>
                                <div className="auth-field__input-wrap">
                                    <span className="auth-field__icon">🔒</span>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="auth-field__input"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="auth-field__toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="auth-error">
                                    <span className="auth-error__icon">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="auth-submit__loader" />
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div className="auth-card__footer">
                            <span>Don't have an account?</span>
                            <button
                                onClick={onSwitchToSignup}
                                className="auth-link"
                            >
                                Create account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
