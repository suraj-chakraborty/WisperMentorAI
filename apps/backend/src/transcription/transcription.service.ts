import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as http from 'http';

@Injectable()
export class TranscriptionService {
    private readonly logger = new Logger(TranscriptionService.name);
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    constructor(private readonly httpService: HttpService) {
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({
            keepAlive: true,
            maxSockets: 10,
            maxFreeSockets: 5,
            timeout: 60000, // 60s socket timeout
        });
    }

    async transcribe(audioBuffer: Buffer, task: 'transcribe' | 'translate' = 'transcribe'): Promise<{ text: string; speaker: string; language?: string }> {
        const sizeMb = audioBuffer.byteLength / (1024 * 1024);
        if (sizeMb > 2) {
            this.logger.warn(`🐘 Processing large audio chunk: ${sizeMb.toFixed(2)}MB. This may take longer than expected.`);
        }

        const maxRetries = 1; // Reduced from 3 to prevent queue death spiral
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const form = new FormData();
                form.append('file', audioBuffer, {
                    filename: 'audio.wav',
                    contentType: 'audio/wav',
                });
                const url = `${this.aiServiceUrl}/transcribe`; // URL modified to remove task query param, now handled by params option

                const startTime = Date.now();
                const response = await lastValueFrom( // Changed firstValueFrom to lastValueFrom
                    this.httpService.post(url, form, {
                        params: { task }, // Added params option for task
                        headers: {
                            ...form.getHeaders(),
                        },
                        timeout: 120000, // 120s timeout for large chunks (increased from 60s)
                    })
                );
                const duration = Date.now() - startTime;

                this.logger.debug(`📝 Transcription (Attempt ${attempt}): "${response.data.text.substring(0, 30)}..." [${response.data.speaker || 'Unknown'}] (${duration}ms)`);
                return {
                    text: response.data.text,
                    speaker: response.data.speaker || 'Meeting', // Changed 'Unknown' to 'Meeting' for consistency with original logic
                    language: response.data.language,
                };
            } catch (error: any) {
                lastError = error;
                const status = error.response?.status;
                const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;

                if (status === 500) {
                    this.logger.error(`❌ AI Service 500 Error: ${errorDetails}`);
                }

                const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

                if (isTimeout) {
                    this.logger.error(`⏳ Transcription timeout on attempt ${attempt}/${maxRetries}. Code: ${error.code}, Name: ${error.name}, Message: ${error.message}`);
                } else {
                    this.logger.error(`❌ Transcription error on attempt ${attempt}/${maxRetries}: ${errorDetails}. Code: ${error.code}, Name: ${error.name}`);
                }

                if (attempt < maxRetries) {
                    const delay = attempt * 1000;
                    this.logger.log(`🔄 Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (lastError.code === 'ECONNABORTED' || lastError.message?.includes('timeout')) {
            throw new Error("AI Service is unresponsive/deadlocked. If this persists, please restart 'run-ai-service.ps1'.");
        }
        throw new Error(`AI Service Error after ${maxRetries} attempts: ${lastError.message}`);
    }
}
