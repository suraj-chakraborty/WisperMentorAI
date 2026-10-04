import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Security headers via Helmet
    app.use(helmet());

    // Global DTO input validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Global Exception Filter for consistent error payloads and status codes
    app.useGlobalFilters(new GlobalHttpExceptionFilter());

    // Restrict CORS to configured origins (no wildcard + credentials flaw)
    const configuredOrigins = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173';
    const originList = configuredOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: originList,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
    });

    const port = configService.get<number>('PORT') || 3001;

    // OpenAPI / Swagger Documentation
    const swaggerConfig = new DocumentBuilder()
        .setTitle('WhisperMentor AI API')
        .setDescription('REST and WebSocket API documentation for WhisperMentor AI co-mentor')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication and registration')
        .addTag('sessions', 'Mentoring session lifecycle and analytics')
        .addTag('translation', 'Live single and batch multilingual translation')
        .addTag('settings', 'User preferences and LLM provider credentials')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(port);
    logger.log(`🚀 WhisperMentor AI Backend running on http://localhost:${port}`);
    logger.log(`📚 Swagger OpenAPI documentation available on http://localhost:${port}/api/docs`);
}

bootstrap();
