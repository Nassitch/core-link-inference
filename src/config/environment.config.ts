import { Injectable } from '@nestjs/common';

@Injectable()
export class EnvironmentConfig {
  readonly apiKey: string = process.env.API_KEY;
  readonly host: string = process.env.HOST ?? '0.0.0.0';
  readonly port: number = parseInt(process.env.PORT) || 8000;
  readonly ollamaUrl: string = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  readonly corsOrigin: string = process.env.CORS_ORIGIN ?? '*';
}