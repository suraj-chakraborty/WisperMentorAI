
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
    private driver: Driver;

    constructor(private configService: ConfigService) {
        const uri = this.configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
        const user = this.configService.get<string>('NEO4J_USER') || 'neo4j';
        const password = this.configService.get<string>('NEO4J_PASSWORD') || 'whispermentor_neo4j';

        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }

    getDriver(): Driver {
        return this.driver;
    }

    getSession(): Session {
        return this.driver.session();
    }

    async onApplicationShutdown() {
        await this.driver.close();
    }
}
