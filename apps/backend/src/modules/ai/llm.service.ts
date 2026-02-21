
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as http from 'http';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LlmConfig {
    provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';
    apiKey?: string;
    model?: string;
}

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: true });
    }

    async generateResponse(messages: ChatMessage[], config?: LlmConfig): Promise<string> {
        const provider = config?.provider || 'ollama';
        const apiKey = config?.apiKey;
        let model = config?.model;

        // Ensure we don't use dated/quota-heavy models if not specified correctly
        if (provider === 'gemini' && (!model || model.includes('gemini-1.5'))) {
            model = 'gemini-2.5-flash';
        }

        try {
            switch (provider) {
                case 'openai':
                    return this.callOpenAI(messages, apiKey, model || 'gpt-4-turbo');
                case 'anthropic':
                    return this.callAnthropic(messages, apiKey, model || 'claude-3-opus-20240229');
                case 'gemini':
                    return this.callGemini(messages, apiKey, model); // model already normalized above
                case 'openrouter':
                    return this.callOpenRouter(messages, apiKey, model || 'openai/gpt-4-turbo');
                case 'ollama':
                default:
                    return this.callOllama(messages, model || 'llama3');
            }
        } catch (error: any) {
            this.logger.error(`LLM call failed (${provider}): ${error.message}`);
            return `I'm having trouble connecting to my brain (${provider}). Please check your API Key and internet connection.`;
        }
    }

    private async callOpenAI(messages: ChatMessage[], apiKey?: string, model?: string): Promise<string> {
        if (!apiKey) throw new Error('OpenAI API Key is missing');
        const openai = new OpenAI({ apiKey, timeout: 30000 }); // 30s timeout
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: model || 'gpt-4-turbo',
        });
        return completion.choices[0].message.content || '';
    }

    private async callAnthropic(messages: ChatMessage[], apiKey?: string, model?: string): Promise<string> {
        if (!apiKey) throw new Error('Anthropic API Key is missing');
        const anthropic = new Anthropic({ apiKey, timeout: 30000 }); // 30s timeout

        // Convert messages to Anthropic format (system is separate)
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }));

        const msg = await anthropic.messages.create({
            model: model || 'claude-3-opus-20240229',
            max_tokens: 1024,
            system: systemMessage,
            messages: userMessages,
        });
        return msg.content[0].type === 'text' ? msg.content[0].text : '';
    }

    private async callGemini(messages: ChatMessage[], apiKey?: string, model?: string): Promise<string> {
        if (!apiKey) throw new Error('Gemini API Key is missing');
        const genAI = new GoogleGenerativeAI(apiKey);

        const systemMessage = messages.find(m => m.role === 'system')?.content || '';

        const geminiModel = genAI.getGenerativeModel({
            model: model || 'gemini-pro',
            systemInstruction: systemMessage ? { role: 'system', parts: [{ text: systemMessage }] } : undefined
        });

        // Convert messages (Filter out system, ensure alternates user/model)
        const history = messages
            .filter(m => m.role !== 'system')
            .slice(0, -1)
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

        const lastMessage = messages[messages.length - 1].content;

        const chat = geminiModel.startChat({ history });

        // Gemini doesn't have a built-in timeout in the standard SDK call yet, 
        // so we wrap it in a custom timeout promise.
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Gemini API call timed out after 30s')), 30000);
        });

        const result = await Promise.race([
            chat.sendMessage(lastMessage),
            timeoutPromise
        ]);

        const response = await result.response;
        return response.text();
    }

    private async callOpenRouter(messages: ChatMessage[], apiKey?: string, model?: string): Promise<string> {
        if (!apiKey) throw new Error('OpenRouter API Key is missing');
        const openai = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
        });
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: model || 'openai/gpt-3.5-turbo',
        });
        return completion.choices[0].message.content || '';
    }

    private async callOllama(messages: ChatMessage[], model?: string): Promise<string> {
        const url = this.configService.get<string>('LLM_API_URL') || 'http://localhost:11434/v1/chat/completions';
        const response = await firstValueFrom(
            this.httpService.post(url, {
                model: model || 'llama3',
                messages,
                temperature: 0.7,
            }, { timeout: 120000 }) // 120s timeout
        );
        return response.data.choices[0].message.content;
    }
}
