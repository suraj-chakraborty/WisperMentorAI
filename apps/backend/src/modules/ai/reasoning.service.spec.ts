import { Test, TestingModule } from '@nestjs/testing';
import { ReasoningService } from './reasoning.service';
import { TranscriptService } from '../transcript/transcript.service';
import { LlmService } from './llm.service';
import { MemoryService } from '../memory/memory.service';
import { SettingsService } from '../settings/settings.service';
import { TranslationService } from '../translation/translation.service';

describe('ReasoningService (H1/B1 Translation Type Mismatch Fixes)', () => {
    let service: ReasoningService;
    let transcriptService: { getTranscripts: jest.Mock };
    let llmService: { generateResponse: jest.Mock };
    let settingsService: { getRawSettings: jest.Mock };
    let translationService: { translate: jest.Mock };

    beforeEach(async () => {
        transcriptService = {
            getTranscripts: jest.fn().mockResolvedValue([
                { speaker: 'User', text: 'How do we deploy the application?' },
                { speaker: 'Meeting', text: 'We use Docker and Kubernetes.' },
            ]),
        };

        llmService = {
            generateResponse: jest.fn(),
        };

        settingsService = {
            getRawSettings: jest.fn().mockResolvedValue({
                lingo: { preferredLanguage: 'es' },
                llm: { provider: 'openai', apiKey: 'test_key', model: 'gpt-4o' },
            }),
        };

        translationService = {
            translate: jest.fn().mockImplementation((text: string, targetLang: string) => {
                return Promise.resolve({
                    translation: `[${targetLang}] ${text}`,
                    warning: 'None',
                });
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReasoningService,
                { provide: TranscriptService, useValue: transcriptService },
                { provide: LlmService, useValue: llmService },
                { provide: MemoryService, useValue: {} },
                { provide: SettingsService, useValue: settingsService },
                { provide: TranslationService, useValue: translationService },
            ],
        }).compile();

        service = module.get<ReasoningService>(ReasoningService);
    });

    describe('generateSessionSummary', () => {
        it('assigns translated string values rather than translation result objects', async () => {
            llmService.generateResponse.mockResolvedValue(
                JSON.stringify({
                    summary: 'Meeting summary about deployment.',
                    actionItems: ['Build Docker container'],
                    keyDecisions: ['Use Kubernetes'],
                    topics: ['DevOps'],
                })
            );

            const result = await service.generateSessionSummary('sess-1', 'user-1');

            expect(typeof result.summary).toBe('string');
            expect(result.summary).toBe('[es] Meeting summary about deployment.');
            expect(result.actionItems).toEqual(['[es] Build Docker container']);
            expect(result.keyDecisions).toEqual(['[es] Use Kubernetes']);
            expect(translationService.translate).toHaveBeenCalledWith('Meeting summary about deployment.', 'es', 'user-1');
        });
    });

    describe('extractConcepts', () => {
        it('assigns translated string values to name_translated and definition_translated', async () => {
            llmService.generateResponse.mockResolvedValue(
                JSON.stringify([
                    { name: 'Kubernetes', definition: 'Container orchestrator' },
                ])
            );

            const result = await service.extractConcepts('sess-1', 'user-1');

            expect(result).toHaveLength(1);
            expect(typeof result[0].name_translated).toBe('string');
            expect(result[0].name_translated).toBe('[es] Kubernetes');
            expect(typeof result[0].definition_translated).toBe('string');
            expect(result[0].definition_translated).toBe('[es] Container orchestrator');
        });
    });

    describe('extractQA', () => {
        it('assigns translated string values to question_translated and answer_translated', async () => {
            llmService.generateResponse.mockResolvedValue(
                JSON.stringify([
                    {
                        question: 'How do we deploy?',
                        answer: 'Use Kubernetes.',
                        speaker_q: 'User',
                        speaker_a: 'Meeting',
                    },
                ])
            );

            const result = await service.extractQA('sess-1', 'user-1');

            expect(result).toHaveLength(1);
            expect(typeof result[0].question_translated).toBe('string');
            expect(result[0].question_translated).toBe('[es] How do we deploy?');
            expect(typeof result[0].answer_translated).toBe('string');
            expect(result[0].answer_translated).toBe('[es] Use Kubernetes.');
        });
    });

    describe('prepareTranscriptForPrompt (BTN-4 Token Windowing)', () => {
        it('returns full text unchanged when under character limit', () => {
            const transcripts = [
                { speaker: 'User', text: 'Hello' },
                { speaker: 'Meeting', text: 'Hi there' },
            ];
            const result = service.prepareTranscriptForPrompt(transcripts, 1000);
            expect(result).toBe('User: Hello\nMeeting: Hi there');
        });

        it('windows large transcripts preserving head and tail with boundary notice', () => {
            const longTranscripts = Array.from({ length: 100 }, (_, i) => ({
                speaker: i % 2 === 0 ? 'User' : 'Meeting',
                text: `Transcript statement line ${i} with substantial detailed conversation text`,
            }));

            const result = service.prepareTranscriptForPrompt(longTranscripts, 1000);

            expect(result.length).toBeLessThanOrEqual(1100);
            expect(result).toContain('Transcript statement line 0');
            expect(result).toContain('Transcript statement line 99');
            expect(result).toContain('intermediate transcript lines omitted to fit context window');
        });
    });
});

