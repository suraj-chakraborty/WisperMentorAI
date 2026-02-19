import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SignupPage: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(email, password, name);
        } catch (err: any) {
            setError('Registration failed. Email might be taken.');
        }
    };

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <h2>Create Account</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input"
                />
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
                <button type="submit" className="btn btn--primary">Sign Up</button>
            </form>
            <p style={{ marginTop: '1rem' }}>
                Already have an account? <button onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#646cff', cursor: 'pointer' }}>Login</button>
            </p>
        </div>
    );
};
