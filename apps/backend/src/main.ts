import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Enable CORS for desktop app
    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`🚀 WhisperMentor AI Backend running on http://localhost:${port}`);
}

bootstrap();
