import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { OpenAIModule } from './modules/openai/openai.module.js';
import { EnvironmentConfig } from './config/environment.config.js';

@Module({
  imports: [HealthModule, OpenAIModule],
  providers: [EnvironmentConfig],
})
export class AppModule {}
