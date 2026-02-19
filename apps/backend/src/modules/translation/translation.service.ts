
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LlmService } from '../ai/llm.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TranslationService {
    private readonly logger = new Logger(TranslationService.name);
    private readonly lingoApiUrl = 'https://api.lingo.dev/v1/translation'; // Placeholder URL

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly llmService: LlmService,
        private readonly settingsService: SettingsService
    ) { }

    async translate(text: string, targetLang: string): Promise<string> {
        if (!text || !text.trim()) return '';

        const apiKey = this.configService.get<string>('LINGO_DEV_API_KEY');

        if (apiKey) {
            try {
                return await this.translateWithLingo(text, targetLang, apiKey);
            } catch (error) {
                this.logger.warn(`Lingo.dev translation failed, falling back to LLM: ${error}`);
            }
        }

        return await this.translateWithLlm(text, targetLang);
    }

    private async translateWithLingo(text: string, targetLang: string, apiKey: string): Promise<string> {
        // Construct Lingo.dev API request
        // Note: This matches a standard translation API structure. 
        // Actual Lingo.dev API might vary slightly.
        const response = await firstValueFrom(
            this.httpService.post(
                this.lingoApiUrl,
                {
                    text,
                    target_lang: targetLang
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
        );
        return response.data.translated_text || response.data.translation || text;
    }

    private async translateWithLlm(text: string, targetLang: string): Promise<string> {
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

        // Fetch user settings
        const settings = await this.settingsService.getSettings('demo-user');
        const llmConfig = settings?.llm || { provider: 'ollama', apiKey: '', model: '' };

        return await this.llmService.generateResponse(messages, {
            provider: llmConfig.provider,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model
        });
    }
}
