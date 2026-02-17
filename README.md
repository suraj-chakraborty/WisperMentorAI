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
- **Private Q&A:** A discreet overlay interface for chat, voice, or sign language queries.
- **Adaptive Reasoning:** The AI adapts its tone and depth based on the mentor's previous explanations.
- **Safety & Permissions:** Built-in governance for session owners to control topic boundaries and data retention.

## Project Structure
We are using a monorepo setup for tight integration between the desktop client and the reasoning backend.

```text
whispermentor-ai/
├── apps/
│   ├── desktop/           # Electron shell + React/Vite renderer
│   │   ├── electron/      # Main process & IPC bridge
│   │   └── src/           # UI components & state management
│   └── backend/           # NestJS server (API + Real-time Gateway)
│       └── src/           # Modules: Auth, Session, Memory, AI, Transcript
├── packages/
│   └── shared/            # Shared TypeScript interfaces & event types
├── assets/                # Logos and project branding
└── docker-compose.yml     # Infrastructure (PostgreSQL, Redis, Neo4j)
```

## System Architecture

```text
  [ User Audio Source ]
           │
  ┌────────▼────────────────┐       ┌───────────────────────┐
  │  Electron Desktop App   │◄─────►│    NestJS Backend     │
  │ (React / Overlay UI)    │       │ (Processing & Logic)  │
  └─────────────────────────┘       └──────────┬────────────┘
                                               │
                                    ┌──────────┼───────────┐
                                    │          │           │
                            ┌───────▼──┐  ┌────▼─────┐  ┌──▼──────┐
                            │ Postgres │  │  Redis   │  │  Neo4j  │
                            │ (Data)   │  │ (Queue)  │  │ (Graph) │
                            └──────────┘  └──────────┘  └─────────┘
```

## Technical Stack
- **Desktop:** Electron, React, Vite, WebRTC, Tailwind
- **Backend:** NestJS, Socket.IO, Prisma ORM
- **Infrastructure:** Docker, Redis (BullMQ), PostgreSQL
- **AI/ML Logic:** Faster-Whisper, spaCy, OpenAI/Gemini, Pinecone/FAISS, Neo4j
- **Sign Language:** MediaPipe, TensorFlow, Three.js (for avatars)

## Development Status
We have completed **Phase 0: Infrastructure** and **Phase 1: Electron Desktop App**.

| Phase | Milestone | Status |
|:---:|---|---|
| 0 | Repo & Multi-project Scaffold | **Complete** |
| 1 | Electron Desktop App & Overlay | **Complete** |
| 2 | System Audio Capture (WebRTC) | Up Next |
| 3 | Real-Time ASR Integration | Planned |
| 4 | Semantic Knowledge Base (Neo4j + Vector) | Planned |
| 5 | AI Reasoning Engine & Private Q&A | Planned |

### Phase 1 Highlights
- **Custom frameless window** with branded TitleBar (drag, minimize, maximize, close)
- **System tray** integration — minimize-to-tray, context menu (Show / Toggle Overlay / Quit)
- **Overlay mode** — `Ctrl+Shift+M` toggles a compact always-on-top floating panel
- **Sidebar navigation** — Dashboard, Session, and Settings with live connection status
- **Dashboard** — Welcome card, stats grid, system status panel, quick session actions
- **Session view** — Live transcript feed + private Q&A chat with typing indicators
- **Overlay view** — Minimal floating UI with recent transcripts and quick question input
- **StatusBar** — Connection state, session timer, overlay toggle
- **WebSocket client** — `useSocket` hook with auto-reconnect, session management, and real-time Q&A via socket.io-client

---

## Setup & Local Development

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- npm (v10+)

### Run the Desktop App
```bash
# Install all dependencies from root
npm install

# Start the Electron app
cd apps/desktop && npm run electron:dev
```

### Run the Backend (for WebSocket)
```bash
# Start infrastructure services
docker compose up -d

# Start the NestJS server
cd apps/backend && npm run start:dev
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Toggle overlay mode |

## License
Distributed under the MIT License.
