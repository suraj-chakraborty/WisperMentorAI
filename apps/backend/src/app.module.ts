import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateEnv } from './common/config/env.validation';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EventsGateway } from './gateway/events.gateway';
import { AuthModule } from './modules/auth/auth.module';
import { SessionModule } from './modules/session/session.module';
import { TranscriptModule } from './modules/transcript/transcript.module';
import { MemoryModule } from './modules/memory/memory.module';
import { AiModule } from './modules/ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { TranscriptionService } from './transcription/transcription.service';
import { SettingsModule } from './modules/settings/settings.module';
import { TranslationModule } from './modules/translation/translation.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
        }),
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,
                limit: 20,
            },
            {
                name: 'medium',
                ttl: 60000,
                limit: 120,
            },
        ]),
        PrismaModule,
        AuthModule,
        SessionModule,
        TranscriptModule,
        MemoryModule,
        AiModule,
        HttpModule,
        SettingsModule,
        TranslationModule,
    ],
    controllers: [AppController],
    providers: [
        EventsGateway,
        TranscriptionService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
