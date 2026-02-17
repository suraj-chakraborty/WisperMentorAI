import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class TranscriptionService {
    private readonly logger = new Logger(TranscriptionService.name);
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    constructor(private readonly httpService: HttpService) { }

    async transcribe(audioBuffer: Buffer): Promise<string> {
        try {
            const form = new FormData();
            form.append('file', audioBuffer, {
                filename: 'audio.webm',
                contentType: 'audio/webm',
            });

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/transcribe`, form, {
                    headers: {
                        ...form.getHeaders(),
                    },
                })
            );

            if (response.data && response.data.text) {
                return response.data.text;
            }
            return '';
        } catch (error: any) {
            // Log full error details for debugging
            this.logger.error(`Transcription failed: ${JSON.stringify(error.response?.data || error.message || error)}`);
            return '';
        }
    }
}
