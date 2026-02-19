
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { TranslationService } from './translation.service';

@Controller('translation')
export class TranslationController {
    constructor(private readonly translationService: TranslationService) { }

    @Post('translate')
    async translate(@Body() body: { text: string; targetLang: string }) {
        if (!body.text || !body.targetLang) {
            throw new HttpException('Text and targetLang are required', HttpStatus.BAD_REQUEST);
        }

        const translatedText = await this.translationService.translate(body.text, body.targetLang);
        return { original: body.text, translation: translatedText, targetLang: body.targetLang };
    }
}
