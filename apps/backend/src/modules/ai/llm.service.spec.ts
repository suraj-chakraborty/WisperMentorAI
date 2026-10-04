import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('LlmService (BTN-3 SDK Client Pooling)', () => {
    let service: LlmService;

    beforeEach(async () => {
        const mockHttpService = {
            axiosRef: {
                defaults: {},
            },
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue('http://localhost:11434/v1/chat/completions'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LlmService,
                { provide: HttpService, useValue: mockHttpService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<LlmService>(LlmService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('reuses cached OpenAI client instance for identical API keys', () => {
        const client1 = (service as any).getOpenAIClient('test-openai-key-1');
        const client2 = (service as any).getOpenAIClient('test-openai-key-1');
        const client3 = (service as any).getOpenAIClient('test-openai-key-2');

        expect(client1).toBe(client2); // Same instance reused
        expect(client1).not.toBe(client3); // Different instance for different key
    });

    it('reuses cached Anthropic client instance for identical API keys', () => {
        const client1 = (service as any).getAnthropicClient('test-anthropic-key-1');
        const client2 = (service as any).getAnthropicClient('test-anthropic-key-1');

        expect(client1).toBe(client2);
    });

    it('reuses cached Gemini client instance for identical API keys', () => {
        const client1 = (service as any).getGeminiClient('test-gemini-key-1');
        const client2 = (service as any).getGeminiClient('test-gemini-key-1');

        expect(client1).toBe(client2);
    });

    it('handles LLM call error gracefully with user-friendly error message', async () => {
        const result = await service.generateResponse(
            [{ role: 'user', content: 'hello' }],
            { provider: 'openai', apiKey: '' } // Missing key
        );

        expect(result).toContain('having trouble connecting to my brain');
    });
});
