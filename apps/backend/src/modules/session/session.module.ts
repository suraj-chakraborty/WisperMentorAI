import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionsController } from './sessions.controller';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [SessionsController],
    providers: [SessionService],
    exports: [SessionService],
})
export class SessionModule { }
