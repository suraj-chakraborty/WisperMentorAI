import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../memory/memory.service';
import { LlmService, ChatMessage } from './llm.service';
import { SettingsService } from '../settings/settings.service';
import { TranscriptService } from '../transcript/transcript.service';

@Injectable()
export class ReasoningService {
    private readonly logger = new Logger(ReasoningService.name);

    constructor(
        private readonly memoryService: MemoryService,
        private readonly llmService: LlmService,
        private readonly settingsService: SettingsService,
        private readonly transcriptService: TranscriptService
    ) { }

    async ask(question: string, sessionId: string): Promise<string> {
        // ... (existing ask method) ...
        this.logger.log(`Reasoning about: "${question}"`);

        // 1. Retrieve Context (RAG) - Filter by SessionId
        const contextDocs = await this.memoryService.search(question, 25, sessionId);
        const contextText = contextDocs
            .map((doc: any) => `- ${doc.text}`)
            .join('\n');

        // 2. Get Tone/Style Examples
        const styleExamples = await this.memoryService.getStyleExamples(sessionId, 3);
        const stylePrompt = styleExamples.length
            ? `\n\nAdopt the speaking style of the following examples:\n${styleExamples.map(e => `"${e}"`).join('\n')}`
            : '';

        this.logger.debug(`Retrieved ${contextDocs.length} memories and ${styleExamples.length} style examples.`);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are WhisperMentor. Answer the question based on the context.${stylePrompt}`
            },
            {
                role: 'user',
                content: `Context:\n${contextText}\n\nQuestion: ${question}`
            }
        ];

        // Fetch Settings
        const settings = await this.settingsService.getRawSettings('demo-user');
        const llmConfig = settings.llm || {};
        const provider = settings.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama');

        return this.llmService.generateResponse(messages, {
            provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });
    }

    async generateSessionSummary(sessionId: string): Promise<{ summary: string; actionItems: string[]; keyDecisions: string[]; topics: string[] }> {
        this.logger.log(`Generating summary for session: ${sessionId}`);

        // 1. Fetch Transcripts
        const transcripts = await this.transcriptService.getTranscripts(sessionId);
        if (!transcripts.length) {
            return { summary: "No transcripts found for this session.", actionItems: [], keyDecisions: [], topics: [] };
        }

        const fullText = transcripts
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n');

        // 2. Construct Prompt
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are an expert AI meeting assistant.
Your goal is to summarize the following meeting transcript into a concise executive summary, extracting action items, key decisions, and relevant topics.

Output MUST be a valid JSON object with the following structure:
{
  "summary": "A concise paragraph (3-5 sentences) summarizing the main topics.",
  "actionItems": ["List of tasks", "Task 2"],
  "keyDecisions": ["Decision 1", "Decision 2"],
  "topics": ["Keyword1", "Keyword2", "Keyword3"]
}

Do not include markdown blocks like \`\`\`json. Just the raw JSON.
If there are no action items or decisions, return empty arrays.`
            },
            {
                role: 'user',
                content: `Transcript:\n${fullText}`
            }
        ];

        // 3. Call LLM
        const settings = await this.settingsService.getRawSettings('demo-user');
        const llmConfig = settings.llm || {};
        const provider = settings.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama');

        const responseText = await this.llmService.generateResponse(messages, {
            provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });

        // 4. Parse JSON
        try {
            // Cleanup potential markdown
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);
            return {
                summary: result.summary || "Summary generation failed.",
                actionItems: result.actionItems || [],
                keyDecisions: result.keyDecisions || [],
                topics: result.topics || []
            };
        } catch (e) {
            this.logger.error(`Failed to parse summary JSON: ${e}`);
            return {
                summary: responseText, // Fallback to raw text
                actionItems: [],
                keyDecisions: [],
                topics: []
            };
        }
    }

    async extractConcepts(sessionId: string): Promise<any[]> {
        this.logger.log(`Extracting concepts for session: ${sessionId}`);

        const transcripts = await this.transcriptService.getTranscripts(sessionId);
        if (!transcripts.length) return [];

        const fullText = transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are a Knowledge Graph extraction expert.
Analyze the transcript and extract key technical concepts.
Values should be specific and technical (e.g., "Dependency Injection", "React Hooks", "OAuth2").

Output a JSON ARRAY of objects, where each object has:
- "name": String (Concept Name)
- "definition": String (Concise definition)
- "examples": String[] (List of examples mentioned or implied)
- "rules": String[] (Best practices, constraints, or rules mentioned)

Example:
[
  {
    "name": "Validation Pipe",
    "definition": "A NestJS class to validate incoming request data.",
    "examples": ["UserDto validation"],
    "rules": ["Always use with class-validator"]
  }
]

Return ONLY valid JSON. No markdown.`
            },
            {
                role: 'user',
                content: `Transcript:\n${fullText}`
            }
        ];

        const settings = await this.settingsService.getRawSettings('demo-user');
        const llmConfig = settings.llm || {};
        const provider = settings.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama');

        const responseText = await this.llmService.generateResponse(messages, {
            provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });

        try {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            this.logger.error(`Failed to parse concepts JSON: ${e}`);
            return [];
        }
    }

    async extractQA(sessionId: string): Promise<any[]> {
        this.logger.log(`Extracting Q&A for session: ${sessionId}`);

        const transcripts = await this.transcriptService.getTranscripts(sessionId);
        if (!transcripts.length) return [];

        const fullText = transcripts.map(t => `${t.speaker}: ${t.text}`).join('\n');

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are an expert at analyzing meeting transcripts.
Identify every specific Question asked and its corresponding Answer.
Ignore rhetorical questions or questions without clear answers.

Output a JSON ARRAY of objects, where each object has:
- "question": String (The question text)
- "answer": String (The summary of the answer given)
- "speaker_q": String (Who asked, usually "User" or "Meeting")
- "speaker_a": String (Who answered, usually "Meeting" or "User")

Example:
[
  {
    "question": "How do I use a ValidationPipe?",
    "answer": "You can add it globally in main.ts or per-controller.",
    "speaker_q": "User",
    "speaker_a": "Meeting"
  }
]

Return ONLY valid JSON. No markdown.`
            },
            {
                role: 'user',
                content: `Transcript:\n${fullText}`
            }
        ];

        const settings = await this.settingsService.getRawSettings('demo-user');
        const llmConfig = settings.llm || {};
        const provider = settings.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama');

        const responseText = await this.llmService.generateResponse(messages, {
            provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });

        try {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            this.logger.error(`Failed to parse QA JSON: ${e}`);
            return [];
        }
    }
}
