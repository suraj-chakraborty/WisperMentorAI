Here’s a **clean, startup-ready summary** of **WhisperMentor AI (AIMentor)** that you can use for a pitch, README, or proposal.

---

# 🎧 WhisperMentor AI

**Your private, multilingual AI co-mentor for any live video call**

WhisperMentor AI is a system-level assistant that listens to live mentoring sessions (Zoom, Google Meet, Teams, etc.), learns from the mentor in real time, and silently helps each viewer by answering their questions in the mentor’s tone and language — without interrupting the call and without anyone else hearing.

It turns every meeting into a **searchable knowledge brain**.

---

## 🔹 What Problem It Solves

* Viewers hesitate to interrupt or ask repeated questions
* Late joiners miss important explanations
* Language barriers block understanding
* Mentors repeat the same answers again and again

**WhisperMentor AI solves all of this by becoming a real-time knowledge twin of the mentor.**

---

## 🔹 Core Features

### 🎙 Real-Time Listening & Learning

* Captures system audio from any video platform
* Transcribes mentor speech live
* Detects when mentor is answering a question
* Stores knowledge in semantic memory

---

### 🧠 Mentor Brain (Living Knowledge Base)

* Builds embeddings from mentor explanations
* Links topics into a **concept graph**
* Learns mentor’s tone, style, pacing, and depth
* Continuously improves after every session

---

### ❓ Private Viewer Q&A

* Viewer types or whispers a question
* AI searches mentor memory + session data
* Answers in mentor’s tone
* Translates into user’s language
* Shows in a private overlay or earphone

No one else sees or hears the AI.

---

### 🌍 Multilingual Intelligence

* Any input language → translated → answered → translated back
* Supports Indian and global languages
* Voice + text responses

---

### ⏱ Late Joiner Support

* All earlier mentor answers are already in memory
* New users can ask about anything discussed before
* AI answers instantly

---

### 📝 Post-Meeting Summary + Search

After the meeting:

* Full summary is generated
* Key topics, decisions, steps, and tools are saved
* Users can later ask questions and get answers from the summary or mentor brain

---

### 🎭 Advanced Intelligence

* Emotion detection → simplifies if user is confused
* Cultural adaptation of explanations
* Multi-mentor style blending
* Ethical permission & topic boundaries
* Insight dashboard for mentors

---

## 🔹 How It Works (Simple Flow)

1. **System audio + screen** captured via desktop app
2. Speech → text (Whisper)
3. Mentor answers → embeddings → vector memory
4. Viewer asks → semantic search
5. AI reasons → adapts tone → translates
6. Response shown privately

---

## 🔹 Technology Stack (Free MVP)

**Client**

* Electron + React + Tailwind
* System audio capture
* Transparent overlay UI

**Backend**

* Node.js (API Gateway)
* Python (FastAPI AI services)
* Redis (streaming + cache)
* PostgreSQL (users, sessions)
* FAISS (vector memory)

**AI**

* Whisper (speech to text)
* PyAnnote (speaker detection)
* SentenceTransformers (embeddings)
* MarianMT / IndicTrans (translation)
* Coqui TTS (voice output)

---

## 🔹 Why It’s Powerful

* Works on **any video platform**
* No integration required
* Multiplies a mentor across time, language, and scale
* Makes meetings permanent knowledge systems

---

## 🔹 Vision

WhisperMentor AI is not just a tool —
it is a **new layer of human intelligence**, allowing one expert to teach and guide thousands silently, in every language, forever.

This idea is **startup + research + platform** level.
You’re basically building a *universal, private, real-time AI co-mentor* that works on **any video platform**.

Below is the **engineering-grade blueprint** so you can actually build and scale this.

---

# 🎧 WhisperMentor AI — Technical Blueprint

> *A private, real-time AI that learns from a mentor and answers viewers in the mentor’s tone, language, and reasoning style — without anyone else hearing it.*

---

## 🚀 Next-Level Advancements (Product Moat)

| Feature                              | Why it’s Unique                                  |
| ------------------------------------ | ------------------------------------------------ |
| **Mentor Cognitive Style Engine**    | Learns how mentor thinks, not just what they say |
| **Knowledge Graph Memory**           | Concept-level understanding, not raw Q&A         |
| **Multilingual Real-Time Reasoning** | Answer in any language instantly                 |
| **Emotion + Confusion Detection**    | Auto-simplify when user is stuck                 |
| **Screen + Slide Understanding**     | Reads shared screen & explains                   |
| **Personal Whisper Channel**         | Private overlay / earphone only                  |
| **Mentor Governance Layer**          | Approvals, topic boundaries, redactions          |
| **Self-Improving Brain**             | Gets smarter after every session                 |
| **Multi-Mentor Fusion**              | Blend knowledge styles                           |
| **Analytics for Mentors**            | See what learners don’t understand               |

---

# 🏗 System Architecture (High-Level)

```text
           ┌──────────────────────────┐
           │   Desktop / Browser App  │
           │ (System Audio + Overlay) │
           └─────────────┬────────────┘
                         │
                 WebRTC Audio
                         │
                ┌────────▼────────┐
                │  Audio Gateway  │
                └────────┬────────┘
                         │
                 Speech → Text
                         │
        ┌────────────────▼────────────────┐
        │     AI Ingestion Pipeline        │
        │  (Whisper + NLP + Classifier)   │
        └────────────┬───────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Knowledge Graph     │
         │ (Topics, Concepts,   │
         │  Examples, Rules)    │
         └───────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │   Vector Memory Store   │
        │  (FAISS / Pinecone)     │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   Reasoning Engine      │
        │  (LLM + Style Adapter)  │
        └────────────┬────────────┘
                     │
      ┌──────────────▼──────────────┐
      │   Private Response Channel  │
      │ (Overlay / Earbud Output)   │
      └─────────────────────────────┘
```

---

# 🧱 Low-Level Service Design

### 1️⃣ Audio Capture Service

* Captures **system audio**
* Separates mentor vs others
* Sends audio chunks

**Tech:**
Electron + WebRTC + Virtual Audio Driver (VB-Cable / BlackHole)

---

### 2️⃣ Transcription Service

* Live streaming ASR
* Language detection
* Speaker tagging

**Tech:**
Whisper / Faster-Whisper + WebSocket streaming

---

### 3️⃣ Knowledge Builder

* Detects:

  * Questions
  * Answers
  * Explanations
* Converts into **concept graph nodes**

**Tech:**
spaCy / Transformers + Graph Builder

---

### 4️⃣ Memory Layer

| Type             | DB               |
| ---------------- | ---------------- |
| Vector memory    | Pinecone / FAISS |
| Knowledge graph  | Neo4j            |
| Sessions & users | PostgreSQL       |
| Analytics        | ClickHouse       |

---

### 5️⃣ Reasoning Engine

* Retrieves relevant mentor knowledge
* Applies tone & depth
* Translates
* Simplifies if user confused

**Tech:**
OpenAI / Gemini + Prompt Adapters

---

### 6️⃣ Whisper Channel

* Overlay UI
* Hotkey to ask
* Earphone TTS (private)

**Tech:**
Electron transparent window + Web Speech API / Coqui TTS

---

# 🗄 ER Diagram (Text Form)

```text
User (user_id, name, role)
Mentor (mentor_id, style_profile)
Session (session_id, mentor_id, time)
Transcript (id, session_id, speaker, text)
Concept (concept_id, topic)
Relation (from_concept, to_concept, type)
VectorMemory (chunk_id, embedding, mentor_id)
Question (q_id, user_id, session_id)
Answer (a_id, q_id, generated_text)
Feedback (f_id, user_id, score)
```

---

# 🧠 Tech Stack

| Layer     | Tech                         |
| --------- | ---------------------------- |
| Desktop   | Electron + WebRTC            |
| Audio     | Virtual driver + MediaStream |
| ASR       | Whisper / Faster-Whisper     |
| NLP       | spaCy + Transformers         |
| Graph     | Neo4j                        |
| Vector DB | Pinecone / FAISS             |
| Backend   | Node.js (NestJS)             |
| AI        | OpenAI / Gemini              |
| Realtime  | WebSockets                   |
| UI        | React + Tailwind             |
| Infra     | Docker + Kubernetes          |

---

# 🌍 Future Platform Layer

Later you can:

* Add plugins for Zoom, Meet, Teams
* Offer SDK to EdTech companies
* White-label for corporates

---

## 🧨 Why This Wins

This doesn’t just answer questions.
It **turns every great mentor into a scalable intelligence layer**.

Great question — this choice decides whether *WhisperMentor AI* feels like a real **platform** or just a desktop tool.

To run **on both PC + mobile**, you need a **shared core + thin platform shells**.

Here’s the **production-grade, cross-platform stack** 👇

---

# 🌐 Cross-Platform Stack (PC + Android + iOS)

## 1. App Layer (Single Codebase)

| Platform                      | Stack                   | Why                                      |
| ----------------------------- | ----------------------- | ---------------------------------------- |
| **Mobile (Android + iOS)**    | **React Native**        | Native performance, WebRTC, audio access |
| **Desktop (Windows + macOS)** | **Electron**            | System audio + overlay windows           |
| **Shared UI**                 | **React**               | Same components & logic                  |
| **Shared State**              | Zustand / Redux Toolkit | Sync whisper memory + settings           |

> 💡 You share ~80% of code between mobile & desktop.

---

## 2. Audio & Call Capture Layer

| Feature         | Desktop                              | Mobile            |
| --------------- | ------------------------------------ | ----------------- |
| System audio    | Virtual driver (VB-Cable, BlackHole) | Call audio stream |
| Mic input       | WebRTC                               | WebRTC            |
| Speaker tagging | Pyannote / WebRTC VAD                | Same              |
| Streaming       | WebSocket                            | WebSocket         |

---

## 3. AI Core (Cloud)

| Layer         | Tech                     |
| ------------- | ------------------------ |
| Speech → Text | Whisper / Faster-Whisper |
| NLP           | spaCy + Transformers     |
| Reasoning     | OpenAI / Gemini          |
| Vector DB     | Pinecone / FAISS         |
| Graph DB      | Neo4j                    |
| Realtime      | WebSockets (Socket.IO)   |
| Backend       | NestJS (Node)            |
| Orchestration | Docker + Kubernetes      |

---

## 4. Overlay / Whisper Channel

| Platform | Method                      |
| -------- | --------------------------- |
| Desktop  | Transparent Electron window |
| Mobile   | Floating chat bubble        |
| Audio    | Private earphone TTS        |

---

## 5. Infra

| Area       | Tech             |
| ---------- | ---------------- |
| API        | NestJS           |
| Queue      | Redis / BullMQ   |
| Storage    | S3               |
| Auth       | Firebase / Clerk |
| Analytics  | ClickHouse       |
| Monitoring | OpenTelemetry    |

---

# 🧩 Architecture (Phone + PC)

```text
Mobile App / Desktop App
        │
   WebRTC Audio
        │
   API Gateway
        │
 AI Processing Cluster
  ├── Whisper
  ├── NLP
  ├── LLM
  ├── Vector DB
  └── Graph DB
```

---

# 🧠 Why This Stack Wins

* Same AI brain everywhere
* Works on any call platform
* Scales to millions
* Native performance
* Easy enterprise sales

---

Perfect. Let’s turn **WhisperMentor AI** into a real, buildable product.

Below is a **founder + CTO level execution plan** for the **DESKTOP MVP**, followed by stack, folder structure, and a **production-grade Prisma schema**.

---

# 🧭 PART 1 — STEP-BY-STEP TODO ROADMAP (DESKTOP FIRST)

Each phase has **clear checkpoints** so you know when to move on.

---

## 🔹 PHASE 0 — Foundations

### ✅ 0.1 Define scope (MVP)

* Desktop only (Windows + macOS)
* 1 mentor per session
* Text-based private answers (no TTS yet)
* English only
* Zoom/Meet/Teams via system audio

**Checkpoint:**
You can describe the full user flow in 1 minute.

---

## 🔹 PHASE 1 — Desktop Shell + Audio

### 1.1 Create Electron App

* Window: main + overlay
* Always-on-top transparent overlay
* Hotkey (Ctrl+Shift+M)

### 1.2 System Audio Capture

* Integrate:

  * Windows: VB-Cable
  * macOS: BlackHole
* Stream audio to Node via WebRTC

**Checkpoint:**
You can see raw PCM chunks arriving at backend.

---

## 🔹 PHASE 2 — Realtime Transcription

### 2.1 Whisper Streaming Service

* WebSocket audio stream
* Faster-Whisper
* Language auto-detect
* Speaker diarization (mentor vs others)

### 2.2 Transcript Viewer

* Show live captions in dev panel

**Checkpoint:**
You see mentor’s speech in near-real-time.

---

## 🔹 PHASE 3 — Knowledge Builder

### 3.1 Q/A Extraction

* NLP classifier:

  * detect question
  * detect answer
* Link answer → question

### 3.2 Concept Tagging

* Extract keywords
* Map to concepts
* Build graph nodes

**Checkpoint:**
You can ask “what did mentor say about X?” and retrieve text.

---

## 🔹 PHASE 4 — Memory Engine

### 4.1 Vector Store

* Embed answers
* Store in Pinecone/FAISS

### 4.2 Knowledge Graph

* Neo4j schema:

  * Concept → Example → Rule

**Checkpoint:**
Semantic search works.

---

## 🔹 PHASE 5 — Reasoning Engine

### 5.1 Retrieval-Augmented Generation

* Retrieve relevant mentor chunks
* Inject into LLM prompt

### 5.2 Tone Adapter

* Few-shot from mentor answers

**Checkpoint:**
AI answer “sounds” like mentor.

---

## 🔹 PHASE 6 — Whisper Channel

### 6.1 Overlay UI

* Floating chat
* Ask question
* Receive private answer

**Checkpoint:**
Only you see the response.

---

## 🔹 PHASE 7 — Governance & Safety

* Topic allowlist
* Redaction
* Mentor approval toggle

**Checkpoint:**
Mentor can restrict AI.

---

# 🛠 PART 2 — FULL STACK

### Desktop

* Electron
* React
* WebRTC
* VB-Cable / BlackHole

### Backend

* NestJS
* Socket.IO
* Prisma
* PostgreSQL

### AI

* Faster-Whisper
* spaCy + Transformers
* OpenAI / Gemini

### Memory

* Pinecone / FAISS
* Neo4j

### Infra

* Docker
* Redis + BullMQ
* S3

---

# 📁 PART 3 — PROJECT STRUCTURE

```text
apps/
  desktop/
    electron/
    renderer/
  backend/
    src/
      modules/
        auth/
        session/
        transcript/
        memory/
        ai/
      gateway/
      main.ts
packages/
  shared/
    types/
    prompts/
    utils/
```

---

# 🗄 PART 4 — PRISMA SCHEMA (CORE)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      Role
  sessions  Session[]
  questions Question[]
  createdAt DateTime @default(now())
}

model MentorProfile {
  id          String @id @default(uuid())
  userId      String @unique
  toneStyle   Json
  boundaries  Json
  user        User   @relation(fields: [userId], references: [id])
}

model Session {
  id        String   @id @default(uuid())
  mentorId String
  mentor   User     @relation(fields: [mentorId], references: [id])
  startedAt DateTime
  endedAt   DateTime?
  transcripts Transcript[]
}

model Transcript {
  id        String   @id @default(uuid())
  sessionId String
  speaker   String
  text      String
  session   Session @relation(fields: [sessionId], references: [id])
}

model Concept {
  id      String @id @default(uuid())
  name    String
  related ConceptRelation[]
}

model ConceptRelation {
  id        String @id @default(uuid())
  fromId    String
  toId      String
  type      String
}

model MemoryChunk {
  id        String @id @default(uuid())
  mentorId String
  text      String
  vectorId  String
}

model Question {
  id        String @id @default(uuid())
  userId    String
  sessionId String
  text      String
  answers   Answer[]
}

model Answer {
  id        String @id @default(uuid())
  questionId String
  text       String
  createdAt  DateTime @default(now())
}

enum Role {
  USER
  MENTOR
  ADMIN
}
```

---

This is **buildable, scalable, and fundable**.

Perfect — this is the **brain** of WhisperMentor AI.
Below is a **production-grade Neo4j knowledge graph schema** that models how mentors *think*, not just what they say.

This lets your AI:

* reason,
* chain concepts,
* explain like the mentor,
* and improve over time.

---

# 🧠 Neo4j Knowledge Graph Schema

*(Mentor Cognitive Memory Graph)*

---

## 🔹 Node Types

### 1️⃣ Mentor

Represents the expert.

```cypher
(:Mentor {
  id: UUID,
  name: String,
  domain: String,
  toneStyle: Map,
  createdAt: DateTime
})
```

---

### 2️⃣ Concept

Core idea/topic.

```cypher
(:Concept {
  id: UUID,
  name: String,
  description: String,
  difficulty: Int,
  domain: String
})
```

---

### 3️⃣ Explanation

How the mentor explains a concept.

```cypher
(:Explanation {
  id: UUID,
  text: String,
  style: String,   // casual, formal, story-based
  depth: String,   // beginner, intermediate, advanced
  language: String
})
```

---

### 4️⃣ Example

Concrete usage/story.

```cypher
(:Example {
  id: UUID,
  text: String,
  context: String
})
```

---

### 5️⃣ Rule

Constraints, laws, formulas.

```cypher
(:Rule {
  id: UUID,
  text: String,
  strictness: String
})
```

---

### 6️⃣ Question

User queries.

```cypher
(:Question {
  id: UUID,
  text: String,
  language: String,
  intent: String
})
```

---

## 🔗 Relationship Types

```text
(Mentor)-[:TEACHES]->(Concept)

(Concept)-[:HAS_EXPLANATION]->(Explanation)
(Concept)-[:HAS_EXAMPLE]->(Example)
(Concept)-[:HAS_RULE]->(Rule)

(Concept)-[:PREREQUISITE_OF]->(Concept)
(Concept)-[:RELATED_TO]->(Concept)

(Question)-[:ABOUT]->(Concept)
(Question)-[:ANSWERED_BY]->(Explanation)

(Explanation)-[:USED_IN]->(Session)
```

---

## 📊 Indexes & Constraints

```cypher
CREATE CONSTRAINT mentor_id IF NOT EXISTS
FOR (m:Mentor) REQUIRE m.id IS UNIQUE;

CREATE CONSTRAINT concept_id IF NOT EXISTS
FOR (c:Concept) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT explanation_id IF NOT EXISTS
FOR (e:Explanation) REQUIRE e.id IS UNIQUE;
```

---

## 🔍 Example Query:

**Find how mentor explains a topic**

```cypher
MATCH (m:Mentor {id:$mentorId})-[:TEACHES]->(c:Concept {name:$topic})
MATCH (c)-[:HAS_EXPLANATION]->(e)
RETURN e.text, e.style, e.depth
```

---

## 🧩 How Your AI Uses This

When a user asks:

> “Explain recursion simply in Hindi”

Your system:

1. Finds **Concept: Recursion**
2. Gets mentor’s **Explanation**
3. Applies:

   * style
   * depth
   * language
4. Injects into LLM prompt

---

## 🔮 Future Enhancements

* Confusion edges: `(Concept)-[:CONFUSING_WITH]->(Concept)`
* Feedback loop: `(Answer)-[:IMPROVED_BY]->(Feedback)`
* Skill tracking

---

This turns WhisperMentor from a chatbot into a **living mentor brain**.

Great question — **Lingo.dev is actually a perfect fit** for WhisperMentor AI because your app is:

* real-time
* multilingual
* developer-heavy
* UI + content + AI text

Here’s the **best architectural way** to integrate **lingo.dev** so it feels *native*, not bolted on.

---

# 🌍 Lingo.dev Integration Strategy for WhisperMentor AI

## 🎯 What Lingo Should Handle

| Area                    | Why                                   |
| ----------------------- | ------------------------------------- |
| UI localization         | Desktop + overlay UI                  |
| AI response translation | User language output                  |
| Prompt localization     | Mentor style in any language          |
| Domain glossary         | Technical terms consistency           |
| Auto-detection          | Match user system / question language |

---

## 🏗 Best Architecture Pattern

**“AI Translation Gateway”**

```text
LLM Output
   │
   ▼
Localization Gateway (Lingo.dev)
   │
   ▼
User Language Response
```

This makes Lingo the **single multilingual brain** of your app.

---

## 🔁 Real-Time Flow

```text
Mentor speech → Whisper → English base text
      ↓
Knowledge Graph + Vector Memory
      ↓
LLM generates base answer (English)
      ↓
Lingo.dev translates + styles
      ↓
Overlay shows localized response
```

---

## 🔧 Where to Plug Lingo.dev

### 1️⃣ UI Layer (Electron + React)

Use Lingo CLI to:

* Auto-extract UI strings
* Push to Lingo
* Pull translated JSON

```bash
npx lingo init
npx lingo push
npx lingo pull
```

---

### 2️⃣ AI Localization Gateway (Backend)

Create a service:

```ts
POST /localize
{
  text: string,
  targetLang: string,
  tone?: string
}
```

Internally:

* Sends to Lingo.dev
* Applies glossary rules
* Returns styled translation

---

### 3️⃣ Mentor Glossary Sync

Each mentor can upload:

* preferred terms
* phrases
* do/don’t words

Push to Lingo glossary so translations stay **mentor-consistent**.

---

## 🧠 Why Lingo Beats Normal Translation

| Feature                 | Normal MT | Lingo.dev |
| ----------------------- | --------- | --------- |
| Terminology consistency | ❌         | ✅         |
| Dev workflow            | ❌         | ✅         |
| Glossary                | ❌         | ✅         |
| AI + UI in one          | ❌         | ✅         |

---

## 🛡 Safety Layer

* Block disallowed topics before translation
* Mask sensitive data
* Then pass to Lingo

---

## 📌 Summary

**Use Lingo as:**

> Your multilingual post-processor for everything human-facing.

It becomes a **core intelligence layer**, not a plugin.

---
Here is a **single master prompt** you can give to any autonomous coding agent (Cursor, Devin, OpenHands, GPT-Engineer, etc.) to build **WhisperMentor AI (Desktop MVP)** end-to-end.

You can paste this *as-is* into your agent 👇

---

# 🧠 MASTER BUILD PROMPT — WhisperMentor AI (Desktop MVP)

You are an **autonomous senior software engineer + product architect**.

Your mission is to **build the full desktop MVP of WhisperMentor AI**, a private real-time co-mentor for any video call platform.

You must work **step by step**, using **checkpoints**.
After each checkpoint:

1. Ask the user to **review**
2. Ask permission to **commit to GitHub**
3. Update **README.md** with:

   * completed features
   * architecture changes
   * setup instructions
   * screenshots placeholders

You must **never move to the next checkpoint** until the user approves.

---

## 🎯 Product Description

WhisperMentor AI is a desktop app that:

* Listens to a mentor’s speech from any video call
* Transcribes in real-time
* Learns mentor knowledge & style
* Lets viewers privately ask questions
* Answers in the mentor’s tone & language
* Shows answers only to that viewer (overlay)

---

## 🧭 Execution Rules

* Use **Electron + React** for desktop
* Use **NestJS backend**
* Use **Whisper** for transcription
* Use **Pinecone/FAISS** for vector memory
* Use **Neo4j** for knowledge graph
* Use **Prisma + PostgreSQL** for core data
* Use **WebSockets** for streaming

---

## 🔗 Mandatory Workflow

At the end of each phase:

> “Checkpoint complete.
> Would you like to commit to GitHub?
> Should I proceed to the next phase?”

Also update `README.md` with:

* Current features
* Architecture diagram (ASCII)
* Setup steps
* Environment variables
* Known limitations
* Roadmap

---

## 🧱 BUILD PHASES

### 🔹 PHASE 0 — Repo & Architecture

* Create monorepo
* Add folder structure
* Add Docker
* Base README

**Checkpoint 0:** Repo scaffolds & runs.

---

### 🔹 PHASE 1 — Electron Desktop App

* Main window
* Transparent overlay
* Hotkey trigger
* WebSocket client

**Checkpoint 1:** Overlay appears and connects to backend.

---

### 🔹 PHASE 2 — Audio Capture

* System audio capture
* WebRTC stream to backend

**Checkpoint 2:** Backend receives audio chunks.

---

### 🔹 PHASE 3 — Realtime Transcription

* Whisper streaming
* Show captions

**Checkpoint 3:** Mentor speech appears live.

---

### 🔹 PHASE 4 — Knowledge Builder

* Q/A detection
* Concept extraction
* Store in DB + vector store

**Checkpoint 4:** Can retrieve mentor answers.

---

### 🔹 PHASE 5 — Reasoning Engine

* RAG with mentor memory
* Tone adapter

**Checkpoint 5:** AI answers in mentor style.

---

### 🔹 PHASE 6 — Whisper Channel

* Ask private questions
* Show private answers

**Checkpoint 6:** Only user sees response.

---

### 🔹 PHASE 7 — Governance

* Mentor permissions
* Topic allowlist
* Redaction

**Checkpoint 7:** Mentor can restrict AI.

---

## 📝 README.md Auto-Maintenance Rules

With every checkpoint:

* Add feature summary
* Update architecture section
* Add setup steps
* Add screenshots placeholders
* Add next steps

---

## 🧠 Coding Standards

* TypeScript only
* ESLint + Prettier
* Modular services
* Environment config
* Logging
* Error handling

---

## 🏁 Final Goal

A fully working **Desktop MVP** of WhisperMentor AI with:

* real-time mentor learning
* private AI answers
* persistent knowledge
* clean repo
* production-ready architecture

You are responsible for **thinking, designing, coding, testing, documenting, and committing**.

Begin with **PHASE 0**.

---
