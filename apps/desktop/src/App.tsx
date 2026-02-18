import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SessionView } from './components/SessionView';
import { OverlayView } from './components/OverlayView';
import { StatusBar } from './components/StatusBar';
import { SettingsView } from './components/SettingsView';

function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [isOverlay, setIsOverlay] = useState(false);
    const [elapsed, setElapsed] = useState(0);

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
    } = useSocket();

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
    }, []);

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
        const result = await window.electronAPI?.toggleOverlay();
        if (typeof result === 'boolean') {
            setIsOverlay(result);
        }
    }, []);

    const handleToggleCapture = useCallback(() => {
        if (isCapturing) {
            stopCapture();
        } else {
            startCapture().catch((err: unknown) => {
                console.error('Failed to start capture:', err);
            });
        }
    }, [isCapturing, startCapture, stopCapture]);

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

export default App;
