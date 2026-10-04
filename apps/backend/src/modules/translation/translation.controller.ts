
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { AuthGuard } from '@nestjs/passport';
import { TranslateDto, BatchTranslateDto } from './dto/translate.dto';

@ApiTags('translation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('translation')
export class TranslationController {
    constructor(private readonly translationService: TranslationService) { }

    @Post('translate')
    async translate(@Body() body: TranslateDto, @Request() req: any) {
        const result = await this.translationService.translate(body.text, body.targetLang, req.user.userId);
        return {
            original: body.text,
            translation: result.translation,
            warning: result.warning,
            targetLang: body.targetLang,
        };
    }

    @Post('batch-translate')
    async batchTranslate(@Body() body: BatchTranslateDto, @Request() req: any) {
        const translations = await this.translationService.translateBatch(body.texts, body.targetLang, req.user.userId);
        return {
            translations,
            targetLang: body.targetLang,
        };
    }
}
