import React from 'react';

const features = [
    {
        icon: '🎙',
        title: 'Real-Time Listening',
        desc: 'Captures system audio from any video call — Zoom, Meet, Teams — and transcribes live.',
    },
    {
        icon: '🧠',
        title: 'Mentor Brain',
        desc: 'Builds semantic memory using embeddings. Learns tone, style, and explanation depth.',
    },
    {
        icon: '❓',
        title: 'Private Q&A',
        desc: 'Ask questions privately via text or voice. AI answers silently in mentor\'s style.',
    },
    {
        icon: '🌍',
        title: 'Multilingual',
        desc: 'Auto language detection. Translates to/from user language with voice + text output.',
    },
    {
        icon: '🤟',
        title: 'Sign Language',
        desc: 'MediaPipe gesture recognition → AI reasoning → Sign avatar response.',
    },
    {
        icon: '🔒',
        title: 'Private & Ethical',
        desc: 'Mentor-controlled permissions. Topic boundaries, redaction, and local-first processing.',
    },
];



function App() {
    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__brand">
                    <img src="/logo-short.png" alt="WM" className="header__logo" />
                    <span className="header__title">WhisperMentor AI</span>
                    <span className="header__version">v0.1.0</span>
                </div>
            </header>

            {/* Hero */}
            <section className="hero">
                <img src="/logo.png" alt="WhisperMentor AI" className="hero__icon" />
                <h1 className="hero__title">
                    Your Private AI Co-Mentor
                </h1>
                <p className="hero__subtitle">
                    A real-time AI that listens to mentor sessions, learns their knowledge & style,
                    and privately answers your questions — in any language, including sign language.
                </p>
            </section>

            {/* Features */}
            <section className="features">
                {features.map((f, i) => (
                    <div key={i} className="feature-card">
                        <span className="feature-card__icon">{f.icon}</span>
                        <h3 className="feature-card__title">{f.title}</h3>
                        <p className="feature-card__desc">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* Footer */}
            <footer className="footer">
                <div>WhisperMentor AI © 2026 — Private, Multilingual, Intelligent</div>
                <div className="footer__hotkey">
                    Toggle overlay: <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Shift</kbd> + <kbd className="kbd">M</kbd>
                </div>
            </footer>
        </div>
    );
}

export default App;
