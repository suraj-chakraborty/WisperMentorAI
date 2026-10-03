
import { Controller, Post, Body, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('translation')
export class TranslationController {
    constructor(private readonly translationService: TranslationService) { }

    @Post('translate')
    async translate(@Body() body: { text: string; targetLang: string }, @Request() req: any) {
        if (!body.text || !body.targetLang) {
            throw new HttpException('Text and targetLang are required', HttpStatus.BAD_REQUEST);
        }

        const result = await this.translationService.translate(body.text, body.targetLang, req.user.userId);
        return {
            original: body.text,
            translation: result.translation,
            warning: result.warning,
            targetLang: body.targetLang
        };
    }
}
