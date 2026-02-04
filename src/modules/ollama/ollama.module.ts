import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { EnvironmentConfig } from '../../config/environment.config';

@Module({
  providers: [OllamaService, EnvironmentConfig],
  exports: [OllamaService],
})
export class OllamaModule {}