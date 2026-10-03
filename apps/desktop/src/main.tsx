import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LingoProvider } from "@lingo.dev/compiler/react";

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <LingoProvider devWidget={{ enabled: false }} >
                <App />
            </LingoProvider>
        </AuthProvider>
    </React.StrictMode>,
);
