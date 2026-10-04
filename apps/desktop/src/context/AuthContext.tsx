import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe token persistence: Uses Electron safeStorage (OS Keychain/DPAPI), falling back to sessionStorage
const retrieveStoredToken = async (): Promise<string | null> => {
    try {
        if (window.electronAPI?.getToken) {
            return await window.electronAPI.getToken();
        }
        return sessionStorage.getItem('token');
    } catch {
        return null;
    }
};

const persistToken = async (token: string): Promise<void> => {
    try {
        if (window.electronAPI?.saveToken) {
            await window.electronAPI.saveToken(token);
            return;
        }
        sessionStorage.setItem('token', token);
    } catch (error) {
        console.warn('Failed to securely persist token:', error);
    }
};

const removeStoredToken = async (): Promise<void> => {
    try {
        if (window.electronAPI?.clearToken) {
            await window.electronAPI.clearToken();
            return;
        }
        sessionStorage.removeItem('token');
    } catch (error) {
        console.warn('Failed to clear stored token:', error);
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const api = axios.create({
        baseURL: API_BASE_URL,
    });

    // Initialize token from safeStorage on mount
    useEffect(() => {
        let isMounted = true;
        retrieveStoredToken().then((storedToken) => {
            if (isMounted) {
                setToken(storedToken);
                if (!storedToken) {
                    setLoading(false);
                }
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    // Validate token and load user profile
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(async () => {
                    await removeStoredToken();
                    setToken(null);
                    setUser(null);
                })
                .finally(() => setLoading(false));
        }
    }, [token]);

    const login = async (email: string, pass: string) => {
        const res = await api.post('/auth/login', { email, password: pass });
        const { access_token, user } = res.data;
        await persistToken(access_token);
        setToken(access_token);
        setUser(user);
    };

    const register = async (email: string, pass: string, name?: string) => {
        const res = await api.post('/auth/register', { email, password: pass, name });
        const { access_token, user } = res.data;
        await persistToken(access_token);
        setToken(access_token);
        setUser(user);
    };

    const logout = async () => {
        await removeStoredToken();
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
