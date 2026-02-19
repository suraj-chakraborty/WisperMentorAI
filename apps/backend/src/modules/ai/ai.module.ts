import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { LlmService } from './llm.service';
import { ReasoningService } from './reasoning.service';
import { MemoryModule } from '../memory/memory.module';
import { SettingsModule } from '../settings/settings.module';

import { TranscriptModule } from '../transcript/transcript.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
    imports: [HttpModule, ConfigModule, MemoryModule, SettingsModule, TranscriptModule, forwardRef(() => TranslationModule)],
    providers: [AiService, LlmService, ReasoningService],
    exports: [AiService, LlmService, ReasoningService],
})
export class AiModule { }
