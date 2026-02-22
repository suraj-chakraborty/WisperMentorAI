# WhisperMentor AI

WhisperMentor AI is a specialized desktop assistant built to help people get more out of live mentoring sessions and video calls. It captures system audio from platforms like Zoom, Teams, or Google Meet, transcribes the conversation in real-time, and builds a searchable semantic memory of the session.

Think of it as a private "co-mentor" that lives in your system tray. You can ask questions about what was just said without interrupting the speaker, and the AI responds using the mentor's specific context and style—privately, via a minimal overlay.

---

## The Vision
Mentoring sessions are often rich in information but hard to review or interact with in the moment. We wanted to solve common friction points:
- **Hesitation:** Participants often skip questions to avoid interrupting the flow.
- **Context Loss:** Late joiners or distracted viewers lose the thread of complex topics.
- **Scalability:** Mentors shouldn't have to repeat the same core concepts across different sessions.

WhisperMentor turns every meeting into a live, interactive knowledge base.

## Key Capabilities
- **Active Listening:** Seamless system audio capture across any desktop video platform.
- **Semantic Memory:** Automatically extracts concepts and builds a knowledge graph (Neo4j) alongside vector embeddings.
- **Private Q&A:** A discreet overlay interface for chat and voice queries — ask questions without interrupting.
- **Adaptive Reasoning:** The AI adapts its tone and depth based on the mentor's previous explanations.
- **Meeting Auto-Link:** Automatically links all participants in the same meeting to a shared session — zero configuration.
- **Multilingual:** Real-time translation to 100+ languages via Lingo.dev with Redis caching to save credits.
- **Smart Caching:** Redis caches translations, embeddings, RAG responses, and summaries — instant repeat lookups.

## Project Structure
We are using a monorepo setup for tight integration between the desktop client and the reasoning backend.

```text
whispermentor-ai/
├── apps/
|   |
|   |__ ai-service/        # Python backend (AI + ASR + Memory)
|   |   └── src/           # Modules: Auth, Session, Memory, AI, Transcript
|   |
│   ├── desktop/           # Electron shell + React/Vite renderer
│   │   ├── electron/      # Main process & IPC bridge
│   │   └── src/           # UI components & state management
│   |
│   └── backend/           # NestJS server (API + Real-time Gateway)
│       └── src/           # Modules: Auth, Session, Memory, AI, Transcript
├── packages/
│   └── shared/            # Shared TypeScript interfaces & event types
├── assets/                # Logos and project branding
└── docker-compose.yml     # Infrastructure (PostgreSQL, Redis, Neo4j)
```

## System Architecture

```text
  [ User Audio Source ]         [ Meeting Detector ]
           │                    (Zoom/Teams/Meet/Webex)
           │                           │
           │                   SHA-256 → Session ID
           │                           │
  ┌────────▼───────────────┐       ┌───▼───────────────────┐
  │  Electron Desktop App  │◄─────►│    NestJS Backend     │
  │ (React / Overlay UI)   │       │ (Processing & Logic)  │
  └────────────────────────┘       └──────────┬────────────┘
                                              │
                                   ┌──────────┼───────────┐
                                   │          │           │
                           ┌───────▼──┐  ┌────▼─────┐  ┌──▼──────┐
                           │ Postgres │  │  Redis   │  │  Neo4j  │
                           │ (Data)   │  │ (Cache)  │  │ (Graph) │
                           └──────────┘  └──────────┘  └─────────┘
```

## Technical Stack
- **Desktop:** Electron, React, Vite, WebRTC
- **Backend:** NestJS, Socket.IO, Prisma ORM
- **Infrastructure:** Docker, PostgreSQL, Redis (Translation/Embedding/RAG/Summary Cache), Neo4j (Knowledge Graph)
- **AI/ML:** Faster-Whisper (ASR), Sentence Transformers (Embeddings), Stereo RMS (Speaker Diarization)
- **Translation:** Lingo.dev SDK → LLM Fallback (Gemini/OpenAI) → Local AI Fallback (3-tier with circuit breaker)
- **LLM Providers:** Gemini, OpenAI, Anthropic, Ollama (user-configurable)

## Lingo.dev Integration
We have integrated **Lingo.dev** as the primary translation provider with a multi-tier fallback strategy.
- **Primary:** Lingo.dev SDK with `fast: true` mode for real-time translation of transcripts, summaries, and Q&A.
- **Fallback:** If the API key is missing or quota is exceeded, the system falls back to the user's LLM (Gemini/OpenAI/Ollama), then to a local AI service.
- **Circuit Breaker:** On network failure, Lingo.dev is bypassed for 60 seconds while fallbacks handle requests.
- **Redis Cache:** All translations are cached (`trans:{sha256}:{lang}`, 24h TTL). If User A translates a phrase, User B gets it from cache at zero API cost.

## Development Status
### progress till now
- **Custom frameless window** with branded TitleBar (drag, minimize, maximize, close)
- **System tray** integration — minimize-to-tray, context menu (Show / Toggle Overlay / Quit)
- **Overlay mode** — `Ctrl+Shift+O` toggles a compact always-on-top floating panel
- **Sidebar navigation** — Dashboard, Session, and Settings with live connection status
- **Dashboard** — Welcome card, stats grid, system status panel, quick session actions
- **Session view** — Live transcript feed + private Q&A chat with typing indicators
- **Overlay view** — Minimal floating UI with recent transcripts and quick question input
- **StatusBar** — Connection state, session timer, overlay toggle
- **WebSocket client** — `useSocket` hook with auto-reconnect, session management, and real-time Q&A via socket.io-client
- **Error Handling** — Integrated error reporting for connection and capture issues
- **System Audio Capture** — Securely captures desktop audio using Electron's `desktopCapturer` and `getUserMedia` constraints.
- **Visual Feedback** — "Start Rec" button with pulsing red indicator and real-time audio level meter.
- **Streaming Pipeline** — Audio is chunked (Opus/WebM) and streamed to the backend via WebSocket.
- **Real-Time ASR** — Integrated **Faster-Whisper** for offline, local, and private speech-to-text.
- **AI Microservice** — Dedicated Python FastAPI service for high-performance inference (`127.0.0.1:8000`).
- **Robust Audio Pipeline** — Audio is captured as **WAV chunks**, ensuring compatibility and stability.
- **Live Transcription** — Real-time text updates in the Overlay and Session View.
- **Microphone Support** — Capture BOTH system audio and user microphone for full dialog context.
- **audio distinguish sustem** — Basic RMS-based heuristic to distinguish User vs System audio.
- **Meeting Insights** — Generate **Executive Summaries**, **Action Items**, and **Key Decisions** from past sessions.
- **Second Brain (RAG)** — Real-time ingestion of transcripts into deeper semantic memory (Neo4j + Vector Embeddings).
- **Live Q&A** — Ask questions during the meeting; the AI answers using context from the current discussion.
- **Settings Panel** — Configure your AI Provider (**Ollama**, **Gemini**, **OpenAI**, **Anthropic**) and manage API keys securely.
- **Microphone Control** — Global hotkey support (`Ctrl+Shift+M`) to mute/unmute mic from anywhere.
- **Enhanced Audio** — Integrated **Noise Suppression**, **Echo Cancellation**, and **High-Pass Filtering** for crystal clear voice capture.
- **User Authentication** — Secure JWT-based Login/Signup system with encrypted password storage.
- **Session History** — View past sessions, auto-load context when re-joining, and seamless history backfill.
- **Export Options** — Export session transcripts and Q&A to **Markdown** or **Text** files for easy sharing.
- **Pause/Resume** — Pause recording during breaks without ending the session; resumes seamlessly.
- **Meeting Detection** — Auto-detects **Zoom**, **Teams**, **Google Meet**, or **Webex** windows and prompts to start recording.
- **Meeting Auto-Link** — Participants in the same meeting automatically share the same session via SHA-256 deterministic session IDs derived from the meeting window title. No manual session sharing needed.
- **Multilingual Translation** — Real-time translation to 100+ languages via **Lingo.dev SDK** with LLM and Local AI fallbacks.
- **Redis Caching Layer** — 4 cache types: Translation (24h), Embedding (48h), RAG Response (1h), Session Summary (2h). Saves API costs and provides instant repeat lookups.
- **Smart Summarization** — Detects summary-intent questions ("summarize", "recap", "overview") and fetches ALL session transcripts for comprehensive summaries.
- **Knowledge Graph Viewer** — Visualize extracted concepts and their relationships in an interactive graph.
- **Glossary View** — Auto-generated dictionary of technical terms from the session.
- **JSON Export** — Export session data as JSON in addition to Markdown and Text.

---


### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+O` | Toggle Overlay Mode (Global) |
| `Ctrl+Shift+M` | Toggle Microphone Mute/Unmute (Global) |

## License
Distributed under the MIT License.
