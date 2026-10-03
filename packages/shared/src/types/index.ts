// ─── User & Auth ────────────────────────────────────────────────

export enum Role {
    USER = 'USER',
    MENTOR = 'MENTOR',
    ADMIN = 'ADMIN',
}

export interface IUser {
    id: string;
    email: string;
    name?: string;
    role: Role;
    createdAt: Date;
}

export interface IMentorProfile {
    id: string;
    userId: string;
    toneStyle: Record<string, unknown>;
    boundaries: Record<string, unknown>;
}

// ─── Session ────────────────────────────────────────────────────

export interface ISession {
    id: string;
    mentorId: string;
    startedAt: Date;
    endedAt?: Date;
    summary?: string;
    actionItems?: string[];
    topics?: string[];
}

// ─── Transcript ─────────────────────────────────────────────────

export interface ITranscript {
    id: string;
    sessionId: string;
    speaker: string;
    text: string;
    timestamp: Date;
    language?: string;
}

// ─── Knowledge ──────────────────────────────────────────────────

export interface IConcept {
    id: string;
    name: string;
    description?: string;
    domain?: string;
}

export interface IConceptRelation {
    id: string;
    fromId: string;
    toId: string;
    type: string;
}

export interface IMemoryChunk {
    id: string;
    mentorId: string;
    text: string;
    vectorId: string;
    sessionId?: string;
}

// ─── Q&A ────────────────────────────────────────────────────────

export interface IQuestion {
    id: string;
    userId: string;
    sessionId: string;
    text: string;
    language?: string;
    createdAt: Date;
}

export interface IAnswer {
    id: string;
    questionId: string;
    text: string;
    confidence?: number;
    createdAt: Date;
}

// ─── WebSocket Events ───────────────────────────────────────────

export enum WsEvent {
    // Client → Server
    JOIN_SESSION = 'session:join',
    LEAVE_SESSION = 'session:leave',
    AUDIO_CHUNK = 'audio:chunk',
    ASK_QUESTION = 'question:ask',

    // Server → Client
    TRANSCRIPT_UPDATE = 'transcript:update',
    ANSWER_RESPONSE = 'answer:response',
    SESSION_STATUS = 'session:status',
    ERROR = 'error',
}

export interface IWsTranscriptUpdate {
    sessionId: string;
    speaker: string;
    text: string;
    timestamp: number;
    isFinal: boolean;
}

export interface IWsQuestionAsk {
    sessionId: string;
    text: string;
    language?: string;
}

export interface IWsAnswerResponse {
    questionId: string;
    text: string;
    confidence?: number;
    language?: string;
}

export interface IWsError {
    code: string;
    message: string;
}
