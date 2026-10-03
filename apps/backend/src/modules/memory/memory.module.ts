
import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { Neo4jService } from './neo4j.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [MemoryService, Neo4jService],
    exports: [MemoryService]
})
export class MemoryModule { }
