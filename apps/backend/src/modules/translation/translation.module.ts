
import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { SettingsModule } from '../settings/settings.module';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';

@Module({
    imports: [HttpModule, ConfigModule, forwardRef(() => AiModule), SettingsModule],
    controllers: [TranslationController],
    providers: [TranslationService],
    exports: [TranslationService]
})
export class TranslationModule { }
