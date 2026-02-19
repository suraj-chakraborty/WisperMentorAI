import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as http from 'http';

@Injectable()
export class TranscriptionService {
    private readonly logger = new Logger(TranscriptionService.name);
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    constructor(private readonly httpService: HttpService) {
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: false });
    }

    async transcribe(audioBuffer: Buffer): Promise<{ text: string; speaker: string; language?: string }> {
        try {
            const form = new FormData();
            form.append('file', audioBuffer, {
                filename: 'audio.wav',
                contentType: 'audio/wav',
            });

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/transcribe`, form, {
                    headers: {
                        ...form.getHeaders(),
                    },
                })
            );

            if (response.data && response.data.text) {
                this.logger.debug(`📝 Transcription: "${response.data.text.substring(0, 30)}..." [${response.data.speaker || 'Unknown'}] (${response.data.language || '?'})`);
                return {
                    text: response.data.text,
                    speaker: response.data.speaker || 'Meeting',
                    language: response.data.language
                };
            }
            return { text: '', speaker: 'Meeting' };
        } catch (error: any) {
            this.logger.error(`Transcription failed: ${error.message}`);
            return { text: '', speaker: 'Meeting' };
        }
    }
}
