import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { redactSecret } from '../../common/utils/logger.utils';
import { encryptCredential, decryptCredential, isEncrypted } from '../../common/utils/crypto.utils';

@Injectable()
export class SettingsService implements OnModuleInit {
    private readonly logger = new Logger(SettingsService.name);
    private readonly encryptionKey: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.encryptionKey =
            this.configService.get<string>('ENCRYPTION_KEY') ||
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }

    async onModuleInit() {
        await this.migrateExistingPlaintextKeys();
    }

    /**
     * Automatic migration for existing rows: encrypt any legacy plaintext API keys at rest.
     */
    async migrateExistingPlaintextKeys() {
        try {
            const users = await this.prisma.user.findMany({
                select: { id: true, settings: true },
            });

            for (const user of users) {
                const settings = (user.settings as Record<string, any>) || {};
                let changed = false;

                if (settings.llm?.apiKey && !isEncrypted(settings.llm.apiKey)) {
                    settings.llm.apiKey = encryptCredential(settings.llm.apiKey, this.encryptionKey);
                    changed = true;
                }

                if (settings.lingo?.apiKey && !isEncrypted(settings.lingo.apiKey)) {
                    settings.lingo.apiKey = encryptCredential(settings.lingo.apiKey, this.encryptionKey);
                    changed = true;
                }

                if (changed) {
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: { settings },
                    });
                    this.logger.log(`🔒 Migrated legacy plaintext API keys to AES-256-GCM for user ${user.id}`);
                }
            }
        } catch (error) {
            this.logger.warn(`Could not run key encryption migration (DB may not be ready): ${error}`);
        }
    }

    async getSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });

        if (!user) {
            return {
                llm: { provider: 'ollama', apiKey: '', model: '' },
                lingo: { apiKey: '', preferredLanguage: 'es' },
            };
        }

        // Deep clone to avoid mutating Prisma cache
        const settings = JSON.parse(JSON.stringify(user.settings || {}));

        // Mask API Keys for safe client delivery
        if (settings?.llm?.apiKey) {
            settings.llm.apiKey = '********';
        }
        if (settings?.lingo?.apiKey) {
            settings.lingo.apiKey = '********';
        }

        return settings;
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const currentSettings = (user.settings as Record<string, any>) || {};
        const newSettings = { ...currentSettings };

        if (dto.llm) {
            newSettings.llm = {
                ...currentSettings.llm,
                ...dto.llm,
            };

            if (dto.llm.apiKey === '********') {
                newSettings.llm.apiKey = currentSettings.llm?.apiKey;
            } else if (dto.llm.apiKey) {
                // Encrypt API key at rest
                newSettings.llm.apiKey = encryptCredential(dto.llm.apiKey, this.encryptionKey);
            }
        }

        if (dto.lingo) {
            newSettings.lingo = {
                ...currentSettings.lingo,
                ...dto.lingo,
            };

            if (dto.lingo.apiKey === '********') {
                newSettings.lingo.apiKey = currentSettings.lingo?.apiKey;
            } else if (dto.lingo.apiKey) {
                // Encrypt API key at rest
                newSettings.lingo.apiKey = encryptCredential(dto.lingo.apiKey, this.encryptionKey);
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { settings: newSettings },
            select: { settings: true },
        });
    }

    async findAllUsers() {
        return this.prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }

    // Internal method to get raw settings (with decrypted unmasked key)
    async getRawSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { settings: true },
        });
        const raw = (user?.settings as Record<string, any>) || {};

        // Decrypt keys for internal service usage
        const decrypted = JSON.parse(JSON.stringify(raw));
        if (decrypted.llm?.apiKey) {
            decrypted.llm.apiKey = decryptCredential(decrypted.llm.apiKey, this.encryptionKey);
        }
        if (decrypted.lingo?.apiKey) {
            decrypted.lingo.apiKey = decryptCredential(decrypted.lingo.apiKey, this.encryptionKey);
        }

        this.logger.debug(
            `getRawSettings(${userId}): provider=${decrypted?.llm?.provider}, apiKey=${redactSecret(decrypted?.llm?.apiKey)}, lingoKey=${redactSecret(decrypted?.lingo?.apiKey)}`,
        );
        return decrypted;
    }
}
