import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LingoProvider } from "@lingo.dev/compiler/react";
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <LingoProvider devWidget={{ enabled: false }} >
                    <App />
                </LingoProvider>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
);
