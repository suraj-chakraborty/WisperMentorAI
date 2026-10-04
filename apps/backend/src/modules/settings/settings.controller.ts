import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings(@Request() req: any) {
        return this.settingsService.getSettings(req.user.userId);
    }

    @Patch()
    async updateSettings(@Request() req: any, @Body() dto: UpdateSettingsDto) {
        return this.settingsService.updateSettings(req.user.userId, dto);
    }
}
