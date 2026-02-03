import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { OpenAIModule } from './modules/openai/openai.module.js';

@Module({
  imports: [HealthModule, OpenAIModule],
})
export class AppModule {}
