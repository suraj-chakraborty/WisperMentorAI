import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { isEncrypted } from '../../common/utils/crypto.utils';

describe('SettingsService (Credential Encryption at Rest)', () => {
  let service: SettingsService;
  let prisma: { user: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock; create: jest.Mock } };

  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'ENCRYPTION_KEY') return testKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('updateSettings', () => {
    it('encrypts API key before saving to database', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        settings: {},
      });
      prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ settings: data.settings }));

      const result = await service.updateSettings('user-1', {
        llm: { provider: 'openai', apiKey: 'sk-secret-plain-key-12345' },
      });

      expect(prisma.user.update).toHaveBeenCalled();
      const savedCall = prisma.user.update.mock.calls[0][0];
      const savedApiKey = savedCall.data.settings.llm.apiKey;

      expect(isEncrypted(savedApiKey)).toBe(true);
      expect(savedApiKey).not.toBe('sk-secret-plain-key-12345');
    });
  });

  describe('getSettings', () => {
    it('masks API keys for client delivery', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        settings: {
          llm: { provider: 'openai', apiKey: 'enc:v1:some_iv:tag:cipher' },
        },
      });

      const settings = await service.getSettings('user-1');
      expect(settings.llm.apiKey).toBe('********');
    });
  });

  describe('getRawSettings', () => {
    it('decrypts encrypted API keys for backend consumption', async () => {
      const plaintext = 'sk-actual-api-key-999';
      // First encrypt via update
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        settings: {},
      });
      prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ settings: data.settings }));

      await service.updateSettings('user-1', {
        llm: { provider: 'openai', apiKey: plaintext },
      });
      const savedEncryptedKey = prisma.user.update.mock.calls[0][0].data.settings.llm.apiKey;

      // Now fetch raw
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        settings: {
          llm: { provider: 'openai', apiKey: savedEncryptedKey },
        },
      });

      const raw = await service.getRawSettings('user-1');
      expect(raw.llm.apiKey).toBe(plaintext);
    });
  });
});
