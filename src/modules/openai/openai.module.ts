import { Module } from '@nestjs/common';
import { OpenAIController } from './openai.controller.js';
import { OpenAIService } from './openai.service.js';
import { OllamaModule } from '../ollama/ollama.module.js';

@Module({
  imports: [OllamaModule],
  controllers: [OpenAIController],
  providers: [OpenAIService],
})
export class OpenAIModule {}
