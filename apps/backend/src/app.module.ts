import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EventsGateway } from './gateway/events.gateway';
import { AuthModule } from './modules/auth/auth.module';
import { SessionModule } from './modules/session/session.module';
import { TranscriptModule } from './modules/transcript/transcript.module';
import { MemoryModule } from './modules/memory/memory.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        SessionModule,
        TranscriptModule,
        MemoryModule,
        AiModule,
    ],
    controllers: [AppController],
    providers: [EventsGateway],
})
export class AppModule { }
