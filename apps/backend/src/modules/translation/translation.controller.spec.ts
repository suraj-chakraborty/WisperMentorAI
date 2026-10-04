import { Test, TestingModule } from '@nestjs/testing';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';

describe('TranslationController', () => {
    let controller: TranslationController;
    let mockTranslationService: {
        translate: jest.Mock;
        translateBatch: jest.Mock;
    };

    beforeEach(async () => {
        mockTranslationService = {
            translate: jest.fn().mockResolvedValue({
                translation: 'Hola mundo',
                warning: undefined,
            }),
            translateBatch: jest.fn().mockResolvedValue([
                { original: 'Hello', translation: 'Hola', warning: undefined },
                { original: 'World', translation: 'Mundo', warning: undefined },
            ]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TranslationController],
            providers: [
                { provide: TranslationService, useValue: mockTranslationService },
            ],
        }).compile();

        controller = module.get<TranslationController>(TranslationController);
    });

    it('should translate single text', async () => {
        const result = await controller.translate(
            { text: 'Hello world', targetLang: 'es' },
            { user: { userId: 'user-1' } }
        );

        expect(mockTranslationService.translate).toHaveBeenCalledWith('Hello world', 'es', 'user-1');
        expect(result).toEqual({
            original: 'Hello world',
            translation: 'Hola mundo',
            warning: undefined,
            targetLang: 'es',
        });
    });

    it('should translate batch of texts in single call (BTN-2)', async () => {
        const result = await controller.batchTranslate(
            { texts: ['Hello', 'World'], targetLang: 'es' },
            { user: { userId: 'user-1' } }
        );

        expect(mockTranslationService.translateBatch).toHaveBeenCalledWith(['Hello', 'World'], 'es', 'user-1');
        expect(result).toEqual({
            translations: [
                { original: 'Hello', translation: 'Hola', warning: undefined },
                { original: 'World', translation: 'Mundo', warning: undefined },
            ],
            targetLang: 'es',
        });
    });
});
