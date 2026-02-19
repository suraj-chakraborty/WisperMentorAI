import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC<{ onSwitchToSignup: () => void }> = ({ onSwitchToSignup }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err: any) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <h2>Login to WisperMentor</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input"
                    required
                />
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" className="btn btn--primary">Login</button>
            </form>
            <p style={{ marginTop: '1rem' }}>
                Don't have an account? <button onClick={onSwitchToSignup} style={{ background: 'none', border: 'none', color: '#646cff', cursor: 'pointer' }}>Sign up</button>
            </p>
        </div>
    );
};
