import { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';

/**
 * Generates a Markdown formatted string from the session data.
 */
export const generateMarkdown = (
    sessionId: string,
    transcripts: TranscriptEntry[],
    answers: AnswerEntry[],
    translations: Record<number, string> = {}
): string => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    let md = `# Session Export - ${date} ${time}\n\n`;
    md += `**Session ID:** ${sessionId}\n\n`;

    md += `## Transcript\n\n`;

    if (transcripts.length === 0) {
        md += `*(No transcript data)*\n\n`;
    } else {
        transcripts.forEach((t, i) => {
            const timestamp = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            md += `**[${timestamp}] ${t.speaker || 'Speaker'}**`;
            if (t.language && t.language !== 'en') {
                md += ` (${t.language})`;
            }
            md += `:\n${t.text}\n`;

            if (translations[i]) {
                md += `> *${translations[i]}*\n`;
            }
            md += `\n`;
        });
    }

    if (answers.length > 0) {
        md += `## Q&A History\n\n`;
        answers.forEach((a, i) => {
            md += `### Q${i + 1}: ${a.question}\n`;
            md += `**AI Mentor:**\n${a.text}\n\n`;
            md += `---\n\n`;
        });
    }

    return md;
};

/**
 * Generates a plain text formatted string.
 */
export const generateText = (
    sessionId: string,
    transcripts: TranscriptEntry[],
    answers: AnswerEntry[],
    translations: Record<number, string> = {}
): string => {
    const date = new Date().toLocaleDateString();

    let text = `SESSION EXPORT - ${date}\n`;
    text += `Session ID: ${sessionId}\n`;
    text += `----------------------------------------\n\n`;

    text += `TRANSCRIPT\n`;
    text += `----------------------------------------\n`;

    transcripts.forEach((t, i) => {
        const timestamp = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        text += `[${timestamp}] ${t.speaker || 'Speaker'}: ${t.text}\n`;
        if (translations[i]) {
            text += `    [Translation]: ${translations[i]}\n`;
        }
    });

    if (answers.length > 0) {
        text += `\n\nQ&A HISTORY\n`;
        text += `----------------------------------------\n`;
        answers.forEach((a, i) => {
            text += `Q: ${a.question}\n`;
            text += `A: ${a.text}\n\n`;
        });
    }

    return text;
};

/**
 * Triggers a browser download of the content.
 */
export const downloadFile = (filename: string, content: string, type: 'text' | 'markdown' | 'json') => {
    let mimeType = 'text/plain';
    if (type === 'markdown') mimeType = 'text/markdown';
    if (type === 'json') mimeType = 'application/json';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
