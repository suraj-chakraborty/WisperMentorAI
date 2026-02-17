WhisperMentor AI

Your private, multilingual AI co-mentor for any live video call

WhisperMentor AI is a system-level AI assistant that listens to live mentoring sessions (Zoom, Google Meet, Microsoft Teams, etc.), learns from the mentor in real time, and silently helps viewers by answering their questions in the mentor’s tone and language — without interrupting the call and without anyone else hearing.

It transforms every meeting into a searchable, intelligent knowledge brain.

🚀 Features
🎙 Real-Time Learning

Captures system audio from any video platform

Live speech-to-text transcription

Speaker identification (mentor vs viewer)

Automatic knowledge extraction

🧠 Mentor Brain

Builds semantic memory using vector embeddings

Stores Q&A and concepts

Learns mentor’s tone, style, and explanation depth

Continuously improves after each session

❓ Private Viewer Q&A

Ask via text or voice

AI answers silently (overlay or earphone)

Uses mentor’s style

Supports multilingual responses

🌍 Multilingual Support

Auto language detection

Translation to/from user language

Voice + text output

⏱ Late Joiner Support

All earlier answers are searchable

Ask about anything discussed before joining

📝 Post-Meeting Intelligence

Auto meeting summary

Key topics, steps, decisions

Searchable session memory

Post-meeting Q&A

🎭 Advanced AI

Emotion detection → adaptive explanations

Cultural context adaptation

Multi-mentor style blending

Ethical permission controls

Analytics dashboard

🏗 System Architecture (High Level)
System Audio/Screen
        ↓
Electron Desktop App
        ↓
WebSocket Stream
        ↓
Node.js API Gateway
        ↓
Python AI Engine
  ├─ Whisper (STT)
  ├─ Speaker Detection
  ├─ Embeddings + Vector DB
  ├─ LLM Reasoning
  └─ Translation + TTS
        ↓
Private Overlay Response

🛠 Tech Stack
Client

Electron

React + Tailwind

System Audio Capture

Transparent Overlay UI

Backend

Node.js (Fastify)

Python (FastAPI)

Redis (streaming, queues)

PostgreSQL (core data)

FAISS (vector memory)

AI

Whisper (speech → text)

PyAnnote (speaker diarization)

SentenceTransformers (embeddings)

MarianMT / IndicTrans (translation)

Coqui TTS (voice)

🗂 Database (Core Tables)

users

mentor_profiles

sessions

transcripts

knowledge_nodes

concept_edges

qa_pairs

viewer_queries

session_summaries

🧪 MVP Setup
# Backend
cd server
pip install -r requirements.txt
uvicorn app:main

# Gateway
cd gateway
npm install
npm run dev

# Desktop Client
cd client
npm install
npm run start

🔒 Privacy & Ethics

System-level capture only (no platform APIs)

Mentor consent required

Topic boundaries & redaction

Local-first processing for MVP

🌟 Vision

WhisperMentor AI is not just an assistant.
It is a new intelligence layer for live communication — turning one mentor into thousands across languages, time zones, and platforms.