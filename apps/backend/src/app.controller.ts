import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHealth() {
        return {
            status: 'ok',
            service: 'WhisperMentor AI Backend',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
        };
    }
}
