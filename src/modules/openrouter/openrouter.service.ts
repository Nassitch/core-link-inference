import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OPENROUTER_DEFAULT_URL, OPENROUTER_TIMEOUT } from './openrouter.constants.js';

@Injectable()
export class OpenRouterService {
  private readonly baseUrl: string = process.env.OPENROUTER_URL ?? OPENROUTER_DEFAULT_URL;
  private readonly apiKey: string | undefined = process.env.OPENROUTER_API_KEY;

  async post<TResponse>(endpoint: string, payload: object): Promise<TResponse> {
    if (!this.apiKey) {
      throw new HttpException({
        error: { message: 'OPENROUTER_API_KEY is not configured', type: 'server_error' },
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new HttpException(data as object, response.status);
    }
    return data as TResponse;
  }
}
