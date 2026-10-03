import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '@nestjs/passport';

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
