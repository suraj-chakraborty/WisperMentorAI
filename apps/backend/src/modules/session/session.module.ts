import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionsController } from './sessions.controller';
import { AiModule } from '../ai/ai.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
    imports: [AiModule, MemoryModule],
    controllers: [SessionsController],
    providers: [SessionService],
    exports: [SessionService],
})
export class SessionModule { }
