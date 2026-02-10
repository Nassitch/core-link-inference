import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { INestApplication } from "@nestjs/common";
import { EnvironmentConfig } from './config/environment.config.js';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { HttpExceptionFilter } from './filters/httpException.filter.js';

async function bootstrap(): Promise<void> {
    const app: INestApplication<any> = await NestFactory.create(AppModule, new FastifyAdapter());

    const config = new EnvironmentConfig();
    app.enableCors({
        origin: config.corsOrigin
    });
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.listen(config.port, config.host);
}

bootstrap();
