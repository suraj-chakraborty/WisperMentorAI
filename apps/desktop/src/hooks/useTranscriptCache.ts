/**
 * localStorage-based transcript & translation cache with 2-hour TTL.
 * Keeps session data available across component unmount/remount and
 * short app restarts, without requiring a backend round-trip.
 */

import type { TranscriptEntry } from './useSocket';

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ── Transcript helpers ─────────────────────────────────────────────

interface CachedTranscripts {
    ts: number; // epoch ms when last written
    data: Array<{
        id: string;
        speaker: string;
        text: string;
        timestamp: string; // ISO string (Date can't survive JSON)
        language?: string;
    }>;
}

function transcriptKey(sessionId: string) {
    return `wm:transcripts:${sessionId}`;
}

/** Persist full transcript list for a session. */
export function saveTranscripts(sessionId: string, transcripts: TranscriptEntry[]): void {
    try {
        const payload: CachedTranscripts = {
            ts: Date.now(),
            data: transcripts.map(t => ({
                id: t.id,
                speaker: t.speaker,
                text: t.text,
                timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : String(t.timestamp),
                language: t.language,
            })),
        };
        localStorage.setItem(transcriptKey(sessionId), JSON.stringify(payload));
    } catch {
        // Storage full or unavailable — best-effort
    }
}

/** Load cached transcripts. Returns null when missing or expired. */
export function loadTranscripts(sessionId: string): TranscriptEntry[] | null {
    try {
        const raw = localStorage.getItem(transcriptKey(sessionId));
        if (!raw) return null;
        const parsed: CachedTranscripts = JSON.parse(raw);
        if (Date.now() - parsed.ts > TTL_MS) {
            localStorage.removeItem(transcriptKey(sessionId));
            return null;
        }
        return parsed.data.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp),
        }));
    } catch {
        return null;
    }
}

/** Append a single transcript entry to the existing cache (batched flush). */
export function appendTranscript(sessionId: string, entry: TranscriptEntry): void {
    try {
        const existing = loadTranscripts(sessionId) || [];
        existing.push(entry);
        saveTranscripts(sessionId, existing);
    } catch {
        // best-effort
    }
}

// ── Translation helpers ────────────────────────────────────────────

function translationKey(sessionId: string) {
    return `wm:translations:${sessionId}`;
}

interface CachedTranslations {
    ts: number;
    data: Record<number, { text: string; warning?: string }>;
}

/** Persist translation map for a session. */
export function saveTranslations(
    sessionId: string,
    translations: Record<number, { text: string; warning?: string }>,
): void {
    try {
        const payload: CachedTranslations = { ts: Date.now(), data: translations };
        localStorage.setItem(translationKey(sessionId), JSON.stringify(payload));
    } catch {
        // best-effort
    }
}

/** Load cached translation data. Returns null when missing or expired. */
export function loadTranslations(
    sessionId: string,
): Record<number, { text: string; warning?: string }> | null {
    try {
        const raw = localStorage.getItem(translationKey(sessionId));
        if (!raw) return null;
        const parsed: CachedTranslations = JSON.parse(raw);
        if (Date.now() - parsed.ts > TTL_MS) {
            localStorage.removeItem(translationKey(sessionId));
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}
