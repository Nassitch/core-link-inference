import { Module } from '@nestjs/common';
import { DecisionController } from './decision.controller.js';
import { DecisionService } from './decision.service.js';
import { JevK5Service } from './jevk5.service.js';
import { OllamaModule } from '../ollama/ollama.module.js';
import { OpenRouterModule } from '../openrouter/openrouter.module.js';

@Module({
  imports: [OllamaModule, OpenRouterModule],
  controllers: [DecisionController],
  providers: [DecisionService, JevK5Service],
})
export class DecisionModule {}
