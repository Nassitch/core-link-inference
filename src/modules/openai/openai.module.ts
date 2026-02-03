import { Module } from '@nestjs/common';
import { OpenAIController } from './openai.controller.js';
import { OllamaModule } from '../ollama/ollama.module.js';

@Module({
  imports: [OllamaModule],
  controllers: [OpenAIController],
})
export class OpenAIModule {}
