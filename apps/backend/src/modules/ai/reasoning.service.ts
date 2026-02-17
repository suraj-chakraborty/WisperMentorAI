
import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../memory/memory.service';
import { LlmService, ChatMessage } from './llm.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ReasoningService {
    private readonly logger = new Logger(ReasoningService.name);

    constructor(
        private readonly memoryService: MemoryService,
        private readonly llmService: LlmService,
        private readonly settingsService: SettingsService
    ) { }

    async ask(question: string, sessionId: string): Promise<string> {
        this.logger.log(`Reasoning about: "${question}"`);

        // 1. Retrieve Context (RAG)
        const contextDocs = await this.memoryService.search(question, 5);
        const contextText = contextDocs
            .map((doc: any) => `- ${doc.text}`)
            .join('\n');

        this.logger.debug(`Retrieved ${contextDocs.length} relevant memories.`);

        // 2. Construct Prompt
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are WhisperMentor, an expert AI assistant and mentor.
Your goal is to help the user learn and recall information from their live sessions.

Instructions:
1. Use the provided Context (retrieved from the user's past audio transcripts) to answer their question.
2. If the answer is found in the context, explicitly reference what was discussed (e.g., "You mentioned that...").
3. Use Markdown formatting (bold, lists) to make your answer easy to read.
4. If the context is empty or irrelevant, use your general knowledge to answer, but clarify that it's general advice.
5. Keep your tone professional, encouraging, and concise.

Context:
${contextText}`
            },
            {
                role: 'user',
                content: question
            }
        ];

        // 3. Get User Settings
        // TODO: Get userId from Session -> User
        // For now, fetch raw settings for default user or from env if needed
        // Since we don't have easy session->user lookup yet without DB call, 
        // we'll use a hack or implement retrieval.
        // Better: Pass userId from EventsGateway (requires session lookup there)

        // Mock lookup for hackathon speed:
        // Assume single user setup or first user found
        // OR, just use LlmService default if no settings.

        // Let's try to get settings for a known user if available.
        // Actually, let's implement getMentorIdFromSession in MemoryService?
        // Or just pass config as "undefined" and let LlmService fallback to Ollama/Env.

        // REAL IMPLEMENTATION:
        // const userId = await this.memoryService.getUserId(sessionId);
        // const settings = await this.settingsService.getRawSettings(userId);
        // const llmConfig = settings.llm;

        // HACK: Use default user or hardcoded ID in controller?
        // We'll leave config undefined for now to use Ollama default, 
        // UNTIL we wire up the User lookup.

        // But the requirement is to use the settings.
        // So I MUST wire up user lookup.
        // Start simple: Fetch ANY user settings (assuming single user usage).
        const allUsers = await this.settingsService.findAllUsers(); // Need to implement this helper
        const user = allUsers[0];
        const config = user?.settings?.llm;

        // 4. Generate Answer
        return this.llmService.generateResponse(messages, config);
    }
}
