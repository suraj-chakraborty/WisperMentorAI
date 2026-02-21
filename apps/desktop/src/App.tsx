import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAuth } from '@/context/AuthContext';
import { useLingoContext } from '@lingo.dev/compiler/react';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SessionView } from '@/components/SessionView';
import { OverlayView } from '@/components/OverlayView';
import { StatusBar } from '@/components/StatusBar';
import { SettingsView } from '@/components/SettingsView';
import { GlossaryView } from '@/components/GlossaryView';
import { KnowledgeGraphView } from '@/components/KnowledgeGraphView';
import { LoginPage } from '@/components/LoginPage';
import { SignupPage } from '@/components/SignupPage';

function AuthenticatedApp({ token }: { token: string }) {
    const { setLocale } = useLingoContext();
    const [activePage, setActivePage] = useState('dashboard');
    const [isOverlay, setIsOverlay] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
    const [meetingAlertApp, setMeetingAlertApp] = useState<string | null>(null);

    // Sync app language on boot
    useEffect(() => {
        fetch('http://127.0.0.1:3001/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.lingo?.preferredLanguage) {
                    setLocale(data.lingo.preferredLanguage);
                }
            })
            .catch(err => console.error("Failed to load settings:", err));
    }, [token, setLocale]);

    const {
        isConnected,
        sessionId,
        sessionStatus,
        transcripts,
        answers,
        serverError,
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
        isPaused,
        togglePause,
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

        // Listen for meeting detection
        window.electronAPI?.onMeetingDetected((appName: string) => {
            if (!isCapturing && !sessionId) {
                setMeetingAlertApp(appName);
                // Switch to dashboard if needed, or overlay?
                // If in overlay mode, we should probably stay there or expand?
                if (isOverlay) {
                    // Maybe show a specific overlay alert?
                } else {
                    window.electronAPI?.maximizeWindow();
                }
            }
        });

        return () => {
            window.electronAPI?.removeListener('mic:toggle');
            window.electronAPI?.removeListener('meeting:detected');
        };
    }, [toggleMic, isCapturing, sessionId, isOverlay]);

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
                            onResumeSession={joinSession}
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
                            error={audioError || serverError}
                            onToggleCapture={handleToggleCapture}
                            isMicEnabled={isMicEnabled}
                            toggleMic={toggleMic}
                            onToggleOverlay={handleToggleOverlay}
                            onToggleTranslation={handleToggleTranslation}
                            isTranslationEnabled={isTranslationEnabled}
                            isPaused={isPaused}
                            togglePause={togglePause}
                            token={token}
                        />
                    )}
                    {activePage === 'settings' && (
                        <SettingsView />
                    )}
                    {activePage === 'glossary' && (
                        <GlossaryView sessionId={sessionId} />
                    )}
                    {activePage === 'graph' && (
                        <KnowledgeGraphView sessionId={sessionId} />
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

            {/* Meeting Alert Modal */}
            {meetingAlertApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center" style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', maxWidth: '300px' }}>
                        <div className="text-4xl mb-4">🎥</div>
                        <h3 className="text-xl font-bold text-white mb-2">Meeting Detected</h3>
                        <p className="text-slate-300 mb-6">
                            <strong>{meetingAlertApp}</strong> is running. Would you like to start a session?
                        </p>
                        <div className="flex gap-3 justify-center" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setMeetingAlertApp(null)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700"
                                style={{ padding: '8px 16px', color: '#cbd5e1', background: 'transparent', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                No
                            </button>
                            <button
                                onClick={() => {
                                    startNewSession();
                                    setMeetingAlertApp(null);
                                }}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                                style={{ padding: '8px 16px', color: 'white', background: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Start Recording
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
