import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { Neo4jService } from './neo4j.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('MemoryService', () => {
    let service: MemoryService;
    let mockNeo4jSession: {
        run: jest.Mock;
        close: jest.Mock;
    };
    let mockNeo4jService: {
        getSession: jest.Mock;
    };
    let mockHttpService: {
        post: jest.Mock;
        axiosRef: { defaults: { httpAgent: any } };
    };
    let mockConfigService: {
        get: jest.Mock;
    };

    beforeEach(async () => {
        mockNeo4jSession = {
            run: jest.fn().mockResolvedValue({ records: [] }),
            close: jest.fn().mockResolvedValue(undefined),
        };

        mockNeo4jService = {
            getSession: jest.fn().mockReturnValue(mockNeo4jSession),
        };

        mockHttpService = {
            post: jest.fn().mockReturnValue(
                of({
                    data: {
                        embedding: [0.1, 0.2, 0.3],
                        embeddings: [[0.1, 0.2], [0.3, 0.4]],
                    },
                })
            ),
            axiosRef: { defaults: { httpAgent: {} } },
        };

        mockConfigService = {
            get: jest.fn((key: string) => {
                if (key === 'AI_SERVICE_URL') return 'http://127.0.0.1:8000';
                if (key === 'AI_SERVICE_INTERNAL_TOKEN') return 'test_secret';
                return null;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MemoryService,
                { provide: Neo4jService, useValue: mockNeo4jService },
                { provide: HttpService, useValue: mockHttpService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<MemoryService>(MemoryService);
    });

    afterEach(async () => {
        await service.onModuleDestroy();
        jest.clearAllMocks();
    });

    it('should buffer saveTranscript and flush batch on threshold', async () => {
        // Enqueue 10 transcripts to hit BATCH_MAX_SIZE (10)
        for (let i = 0; i < 10; i++) {
            await service.saveTranscript('session-123', `Test transcript ${i}`, 'User', 'en');
        }

        // Verify batch embedding was fetched in a single HTTP request
        expect(mockHttpService.post).toHaveBeenCalledTimes(1);
        expect(mockHttpService.post).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/embed',
            expect.objectContaining({
                texts: expect.arrayContaining(['Test transcript 0', 'Test transcript 9']),
            }),
            expect.objectContaining({
                headers: { 'X-Internal-Token': 'test_secret' },
            })
        );

        // Verify single Neo4j query with UNWIND was executed
        expect(mockNeo4jService.getSession).toHaveBeenCalled();
        expect(mockNeo4jSession.run).toHaveBeenCalledWith(
            expect.stringContaining('UNWIND $items AS item'),
            expect.objectContaining({
                items: expect.any(Array),
            })
        );
        expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should ignore empty transcripts', async () => {
        await service.saveTranscript('session-123', '   ');
        await service.flushTranscripts();

        expect(mockHttpService.post).not.toHaveBeenCalled();
        expect(mockNeo4jService.getSession).not.toHaveBeenCalled();
    });

    it('should flush pending items on module destroy', async () => {
        await service.saveTranscript('session-123', 'Single buffered item', 'User', 'en');

        expect(mockHttpService.post).not.toHaveBeenCalled();

        await service.onModuleDestroy();

        expect(mockHttpService.post).toHaveBeenCalledTimes(1);
        expect(mockNeo4jSession.run).toHaveBeenCalledWith(
            expect.stringContaining('UNWIND $items AS item'),
            expect.anything()
        );
    });

    it('should search using single query embedding', async () => {
        mockNeo4jSession.run.mockResolvedValueOnce({
            records: [
                {
                    get: (field: string) => {
                        if (field === 'text') return 'Found text';
                        if (field === 'timestamp') return '2026-10-03';
                        if (field === 'score') return 0.95;
                        return null;
                    },
                },
            ],
        });

        const results = await service.search('search query', 3, 'session-123');

        expect(mockHttpService.post).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/embed',
            { text: 'search query' },
            expect.anything()
        );
        expect(results).toHaveLength(1);
        expect(results[0].text).toBe('Found text');
        expect(results[0].score).toBe(0.95);
    });
});
