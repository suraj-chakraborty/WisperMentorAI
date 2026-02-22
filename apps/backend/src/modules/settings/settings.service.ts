
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });

        // HACKATHON MODE: Return default if user missing
        if (!user) {
            return {
                llm: { provider: 'ollama', apiKey: '', model: '' },
                lingo: { apiKey: '', preferredLanguage: 'es' }
            };
        }

        // Deep clone to avoid mutating Prisma cache — without this,
        // getRawSettings() can return '********' instead of real keys
        const settings = JSON.parse(JSON.stringify(user.settings || {}));

        // Mask API Key
        if (settings?.llm?.apiKey) {
            settings.llm.apiKey = '********';
        }
        if (settings?.lingo?.apiKey) {
            settings.lingo.apiKey = '********';
        }

        return settings;
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        // Fetch current settings to merge
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });

        const currentSettings = (user?.settings as any) || {};

        // Merge logic
        const newSettings = { ...currentSettings };

        if (dto.llm) {
            newSettings.llm = {
                ...currentSettings.llm,
                ...dto.llm,
            };

            if (dto.llm.apiKey === '********') {
                newSettings.llm.apiKey = currentSettings.llm?.apiKey;
            }
        }

        if (dto.lingo) {
            newSettings.lingo = {
                ...currentSettings.lingo,
                ...dto.lingo,
            };
            if (dto.lingo.apiKey === '********') {
                newSettings.lingo.apiKey = currentSettings.lingo?.apiKey;
            }
        }

        // UPSERT: Create user if missing
        if (!user) {
            return this.prisma.user.create({
                data: {
                    id: userId,
                    email: `${userId}@example.com`,
                    name: 'Demo User',
                    password: 'demo_password_hash_placeholder',
                    settings: newSettings,
                },
                select: { settings: true },
            });
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { settings: newSettings },
            select: { settings: true }, // Return updated settings
        });
    }

    // Helper for hackathon: Get all users to find the first one
    async findAllUsers() {
        return this.prisma.user.findMany() as any;
    }

    // Internal method to get raw settings (with unmasked key)
    async getRawSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });
        const raw = user?.settings as any || {};
        console.log(`🔑 [DEBUG] getRawSettings(${userId}): provider=${raw?.llm?.provider}, apiKey=${raw?.llm?.apiKey ? raw.llm.apiKey.slice(0, 8) + '...' : '(empty)'}, lingoKey=${raw?.lingo?.apiKey ? raw.lingo.apiKey.slice(0, 8) + '...' : '(empty)'}`);
        return raw;
    }
}
