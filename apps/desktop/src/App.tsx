import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAuth } from './context/AuthContext';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SessionView } from './components/SessionView';
import { OverlayView } from './components/OverlayView';
import { StatusBar } from './components/StatusBar';
import { SettingsView } from './components/SettingsView';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';

function AuthenticatedApp({ token }: { token: string }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [isOverlay, setIsOverlay] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);

    const {
        isConnected,
        sessionId,
        sessionStatus,
        transcripts,
        answers,
        joinSession,
        leaveSession,
        sendQuestion,
        sendAudioChunk,
        startNewSession,
        toggleTranslation,
    } = useSocket(token);

    const {
        isCapturing,
        audioLevel,
        startCapture,
        stopCapture,
        error: audioError,
        isMicEnabled,
        toggleMic,
    } = useAudioCapture({
        onAudioChunk: (chunk) => sendAudioChunk(chunk),
    });

    // Listen for overlay toggle from Electron main process
    useEffect(() => {
        window.electronAPI?.onOverlayToggled((overlayState: boolean) => {
            setIsOverlay(overlayState);
        });

        // Listen for mic toggle
        const handleMicToggle = () => toggleMic();
        window.electronAPI?.onToggleMic(handleMicToggle);

        return () => {
            window.electronAPI?.removeListener('mic:toggle');
        };
    }, [toggleMic]);

    // Session timer
    useEffect(() => {
        if (!sessionId) {
            setElapsed(0);
            return;
        }
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleToggleOverlay = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const result = await window.electronAPI?.toggleOverlay();
        if (typeof result === 'boolean') {
            setIsOverlay(result);
        }
    }, []);

    const handleToggleCapture = useCallback((sourceId?: string) => {
        if (isCapturing) {
            stopCapture();
        } else {
            startCapture(sourceId).catch((err: unknown) => {
                console.error('Failed to start capture:', err);
            });
        }
    }, [isCapturing, startCapture, stopCapture]);

    const handleToggleTranslation = useCallback((enabled: boolean) => {
        setIsTranslationEnabled(enabled);
        toggleTranslation(enabled);
    }, [toggleTranslation]);

    const handleNavigate = useCallback((page: string) => {
        setActivePage(page);
    }, []);

    // ── Overlay Mode Render ──
    if (isOverlay) {
        return (
            <div className="app app--overlay">
                <OverlayView
                    transcripts={transcripts}
                    answers={answers}
                    onSendQuestion={sendQuestion}
                    onToggleOverlay={handleToggleOverlay}
                    audioLevel={audioLevel}
                />
            </div>
        );
    }

    // ── Normal Mode Render ──
    return (
        <div className="app">
            <TitleBar isOverlay={isOverlay} />

            <div className="app__body">
                <Sidebar
                    activePage={activePage}
                    onNavigate={handleNavigate}
                    isConnected={isConnected}
                    sessionId={sessionId}
                    isOverlay={isOverlay}
                />

                <main className="app__main">
                    {activePage === 'dashboard' && (
                        <Dashboard
                            isConnected={isConnected}
                            sessionStatus={sessionStatus}
                            sessionId={sessionId}
                            isCapturing={isCapturing}
                            onStartSession={startNewSession}
                            onNavigate={handleNavigate}
                        />
                    )}
                    {activePage === 'session' && (
                        <SessionView
                            sessionId={sessionId}
                            transcripts={transcripts}
                            answers={answers}
                            onSendQuestion={sendQuestion}
                            onLeaveSession={leaveSession}
                            onStartSession={startNewSession}
                            isConnected={isConnected}
                            isCapturing={isCapturing}
                            audioLevel={audioLevel}
                            error={audioError}
                            onToggleCapture={handleToggleCapture}
                            isMicEnabled={isMicEnabled}
                            toggleMic={toggleMic}
                            onToggleOverlay={handleToggleOverlay}
                            onToggleTranslation={handleToggleTranslation}
                            isTranslationEnabled={isTranslationEnabled}
                        />
                    )}
                    {activePage === 'settings' && (
                        <SettingsView />
                    )}
                </main>
            </div>

            <StatusBar
                isConnected={isConnected}
                sessionId={sessionId}
                isOverlay={isOverlay}
                onToggleOverlay={handleToggleOverlay}
                elapsed={elapsed}
            />
        </div>
    );
}

function App() {
    const { user, token, loading } = useAuth();
    const [isSignup, setIsSignup] = useState(false);

    // Auth Guard
    if (loading) return <div className="app-loading">Loading WisperMentor...</div>;

    if (!user || !token) {
        return isSignup
            ? <SignupPage onSwitchToLogin={() => setIsSignup(false)} />
            : <LoginPage onSwitchToSignup={() => setIsSignup(true)} />;
    }

    return <AuthenticatedApp token={token} />;
}

export default App;
