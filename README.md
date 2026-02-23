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

## UI Screenshots

### Login
![Login Page](apps/desktop/public/login.jpg)

### Sign Up
![Sign Up Page](apps/desktop/public/signup.jpg)

### Dashboard
![Dashboard](apps/desktop/public/dashboard.jpg)

### Active Session
![Active Session](apps/desktop/public/active-session.jpg)

### Overlay Mode
![Overlay Mode](apps/desktop/public/overlay.jpg)

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

---

## Minimum Requirements

| Component       | Requirement                                    |
|-----------------|------------------------------------------------|
| **OS**          | Windows 10/11, macOS 12+, or Linux (x64)       |
| **Node.js**     | v18.0.0 or higher                               |
| **npm**         | v9.0.0 or higher                                |
| **Python**      | 3.10 or higher                                  |
| **Docker**      | Docker Desktop 4.x (for PostgreSQL, Redis, Neo4j) |
| **RAM**         | 8 GB minimum (16 GB recommended for AI models)  |
| **Disk Space**  | ~4 GB (dependencies + Docker images + AI models)|
| **GPU**         | Optional — Faster-Whisper can use CUDA for faster transcription |
| **Microphone**  | Optional — Required only for mic input capture  |

> **Note:** An active internet connection is required for LLM API calls (Gemini / OpenAI / Anthropic) and Lingo.dev translations. Ollama runs fully offline.

---

## Getting Started

Follow these steps in order to go from a fresh clone to a fully running app.

### Step 1 — Clone the Repository

```bash
git clone https://github.com/suraj-chakraborty/WisperMentorAI.git
cd whispermentor-ai
```

### Step 2 — Start Infrastructure (Docker)

you need to install PostgreSQL, Redis, and Neo4j with default settings in docker.


Verify all three containers are healthy:


### Step 3 — Configure Environment Variables

Copy the template and fill in your API keys:

```bash
# From the project root
cp .env.example .env
```

Edit `.env` and add your LLM API keys (at minimum one of Gemini / OpenAI / Anthropic / Ollama):

```dotenv
DATABASE_URL=postgresql://whispermentor:whispermentor_secret@localhost:5432/whispermentor_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=whispermentor_neo4j

LINGODOTDEV_API_KEY=your_lingo_api_key
# Add at least one LLM key for safety
GEMINI_API_KEY=your_gemini_key
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
```

### Step 4 — Install Root Dependencies

```bash
# From the project root
npm install
```

### Step 5 — Set Up the Backend (NestJS)

```bash
cd apps/backend
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the backend in dev mode
npm run start:dev
```

The backend will start on `http://127.0.0.1:3001`.

### Step 6 — Start the AI Service (Python)

Open a **new terminal** and run:

**Windows (PowerShell):**
if everything is installed properly then run this command 
```powershell
.\run-ai-service.ps1
```

**macOS / Linux:**
```bash
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

The AI service will start on `http://127.0.0.1:8000`. On first run, it will download the Faster-Whisper model (~1 GB).

### Step 7 — Launch the Desktop App (Electron + React)

Open a **new terminal** and run:

```bash
cd apps/desktop
npm install
npm run electron:dev
```

The Electron app should open automatically. Create an account (Signup) and start a session!

### Quick Checklist

| Step | Command / Action | Expected Result |
|------|------------------|-----------------|
| 1 | `docker ps` | 3 containers running |
| 2 | Backend terminal | `Nest application successfully started` |
| 3 | AI service terminal | `Uvicorn running on http://127.0.0.1:8000` |
| 4 | Desktop terminal | Electron window opens with Login page |
| 5 | Sign up + Start session | Live transcription when audio is playing |

---

<p align="center"><b>created by <a href="https://suraj-chakraborty.netlify.app">suraj chakraborty</a>, if you like it please give a star ⭐</b></p>
