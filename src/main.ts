import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { INestApplication } from "@nestjs/common";
import { EnvironmentConfig } from './config/environment.config.js';

async function bootstrap(): Promise<void> {
    const app: INestApplication<any> = await NestFactory.create(AppModule);

    const config = new EnvironmentConfig();
    app.enableCors({
        origin: config.corsOrigin
    });

    await app.listen(config.port, config.host);
}

bootstrap();
