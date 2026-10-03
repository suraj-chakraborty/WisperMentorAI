
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LlmService } from '../ai/llm.service';
import { SettingsService } from '../settings/settings.service';

import { LingoDotDevEngine } from 'lingo.dev/sdk';

@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);

    // Circuit breaker state
    private degradedUntil: number = 0;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly llmService: LlmService,
        private readonly settingsService: SettingsService
    ) { }

    async translate(text: string, targetLang: string, userId?: string): Promise<{ translation: string; warning?: string }> {
        if (!text || !text.trim()) return { translation: '' };
        if (!targetLang) return { translation: text };

        const now = Date.now();
        const isDegraded = now < this.degradedUntil;

        // Fetch user settings
        const settings = await this.settingsService.getRawSettings(userId || 'demo-user');
        const lingoConfig = settings?.lingo || {};
        const llmConfig = settings?.llm || {};
        this.logger.log(`🔑 [DEBUG] translate() userId=${userId || 'demo-user'}, lingoApiKey=${lingoConfig.apiKey ? lingoConfig.apiKey.slice(0, 8) + '...' : '(empty)'}, llmProvider=${settings?.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama')}, llmApiKey=${llmConfig.apiKey ? llmConfig.apiKey.slice(0, 8) + '...' : '(empty)'}`);

        // Use user's key first
        const userApiKey = lingoConfig.apiKey;
        const envApiKey = this.configService.get<string>('LINGO_DEV_API_KEY');

        if (userApiKey && !isDegraded) {
            try {
                const translation = await this.translateWithLingo(text, targetLang, userApiKey);
                return { translation };
            } catch (error: any) {
                const isQuotaError = error.message?.includes('Maximum number of translated words') || error.message?.includes('upgrade');
                const isNetworkError = error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('fetch failed');

                if (isQuotaError && envApiKey && envApiKey !== userApiKey) {
                    this.logger.warn(`User Lingo key quota exceeded, trying environment key...`);
                    try {
                        const translation = await this.translateWithLingo(text, targetLang, envApiKey);
                        return { translation };
                    } catch (innerError) {
                        this.logger.error(`Environment Lingo key also failed: ${innerError}`);
                    }
                } else if (isNetworkError) {
                    this.logger.error(`🚨 Lingo.dev network failure. Entering degraded mode for 60s. Error: ${error.message}`);
                    this.degradedUntil = Date.now() + 60000;
                } else {
                    this.logger.warn(`Lingo.dev translation failed: ${error.message}`);
                }
            }
        } else if (envApiKey && !isDegraded) {
            try {
                const translation = await this.translateWithLingo(text, targetLang, envApiKey);
                return { translation };
            } catch (error: any) {
                this.logger.warn(`Environment Lingo.dev translation failed: ${error.message}`);
            }
        }

        // 2. LLM Fallback (Gemini/Ollama)
        try {
            const translation = await this.translateWithLlm(text, targetLang, settings);
            return { translation };
        } catch (error: any) {
            this.logger.warn(`LLM fallback failed, falling back to Local AI: ${error.message}`);
        }

        // 3. Local AI Fallback (Port 8000)
        try {
            return await this.translateWithLocalAi(text);
        } catch (error: any) {
            this.logger.error(`❌ All translation fallbacks failed: ${error.message}. Returning original text.`);
            return { translation: text, warning: "Translation Unavailable (All providers failed)" };
        }
    }

    private async translateWithLingo(text: string, targetLang: string, apiKey: string): Promise<string> {
        const lingo = new LingoDotDevEngine({ apiKey });
        return await lingo.localizeText(text, {
            sourceLocale: 'en',
            targetLocale: targetLang,
            fast: true // Prioritize speed for real-time transcription
        });
    }

    private async translateWithLocalAi(text: string): Promise<{ translation: string; warning?: string }> {
        const url = this.configService.get<string>('LOCAL_AI_URL') || 'http://localhost:8000/translate';
        const response = await firstValueFrom(
            this.httpService.post(url, { text }, { timeout: 10000 })
        );
        return {
            translation: response.data.translation,
            warning: response.data.warning || "Using Local AI Fallback (English Only)"
        };
    }

    private async translateWithLlm(text: string, targetLang: string, settings: any): Promise<string> {
        const messages = [
            {
                role: 'system' as const,
                content: `You are a professional translator. Translate the following text to ${targetLang}. Return ONLY the translated text, no explanations.`
            },
            {
                role: 'user' as const,
                content: text
            }
        ];

        const llmConfig = settings?.llm || { provider: 'ollama', apiKey: '', model: '' };
        const provider = settings?.offlineMode ? 'ollama' : (llmConfig.provider || 'ollama');

        // LlmService already has its own timeout and error handling returning a string
        const result = await this.llmService.generateResponse(messages, {
            provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });

        // If LLM service returns its "trouble connecting" message, we consider it a failure here
        if (result.includes("trouble connecting to my brain")) {
            throw new Error(`LLM provider ${provider} unresponsive`);
        }

        return result;
    }
}
