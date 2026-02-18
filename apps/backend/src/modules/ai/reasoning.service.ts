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

        // 1. Retrieve Context (RAG)
        const contextDocs = await this.memoryService.search(question, 25);
        const contextText = contextDocs
            .map((doc: any) => `- ${doc.text}`)
            .join('\n');

        this.logger.debug(`Retrieved ${contextDocs.length} relevant memories.`);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are WhisperMentor. Answer the question based on the context.`
            },
            {
                role: 'user',
                content: `Context:\n${contextText}\n\nQuestion: ${question}`
            }
        ];

        // Fetch Settings
        const settings = await this.settingsService.getRawSettings('demo-user');
        const llmConfig = settings.llm || {};

        return this.llmService.generateResponse(messages, {
            provider: llmConfig.provider || 'ollama',
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });
    }

    async generateSessionSummary(sessionId: string): Promise<{ summary: string; actionItems: string[]; keyDecisions: string[] }> {
        this.logger.log(`Generating summary for session: ${sessionId}`);

        // 1. Fetch Transcripts
        const transcripts = await this.transcriptService.getTranscripts(sessionId);
        if (!transcripts.length) {
            return { summary: "No transcripts found for this session.", actionItems: [], keyDecisions: [] };
        }

        const fullText = transcripts
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n');

        // 2. Construct Prompt
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are an expert AI meeting assistant.
Your goal is to summarize the following meeting transcript into a concise executive summary, extracting action items and key decisions.

Output MUST be a valid JSON object with the following structure:
{
  "summary": "A concise paragraph (3-5 sentences) summarizing the main topics.",
  "actionItems": ["List of tasks", "Task 2"],
  "keyDecisions": ["Decision 1", "Decision 2"]
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

        const responseText = await this.llmService.generateResponse(messages, {
            provider: llmConfig.provider || 'ollama',
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
                keyDecisions: result.keyDecisions || []
            };
        } catch (e) {
            this.logger.error(`Failed to parse summary JSON: ${e}`);
            return {
                summary: responseText, // Fallback to raw text
                actionItems: [],
                keyDecisions: []
            };
        }
    }
}
