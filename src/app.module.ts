import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { OpenAIModule } from './modules/openai/openai.module.js';
import { DecisionModule } from './modules/decision/decision.module.js';

@Module({
  imports: [HealthModule, OpenAIModule, DecisionModule],
})
export class AppModule {}
