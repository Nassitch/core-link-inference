import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaService {
  private readonly baseUrl: string = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  private readonly timeout: number = 120000;

  private async request(endpoint: string, options?: RequestInit): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: options?.body,
      method: options?.method,
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async chatCompletion(model: string, messages: any[]): Promise<string> {
    const data = await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages, stream: false }),
    });
    return data.message?.content ?? '';
  }

  async chatCompletionStream(model: string, messages: any[]): Promise<NodeJS.ReadableStream> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: AbortSignal.timeout(this.timeout),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    let buffer = '';

    const nodeStream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer) controller.enqueue(textEncoder.encode(buffer));
            controller.close();
            break;
          }
          buffer += textDecoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(line => {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                controller.enqueue(textEncoder.encode(JSON.stringify(parsed)).buffer);
              } catch {}
            }
          });
        }
      }
    });

    return nodeStream as unknown as NodeJS.ReadableStream;
  }

  async listModels(): Promise<any[]> {
    const data = await this.request('/api/tags');
    return data.models ?? [];
  }

  async generateEmbeddings(model: string, input: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];
    const embeddings: number[][] = [];
    for (const text of inputs) {
      const data = await this.request('/api/embeddings', {
        method: 'POST',
        body: JSON.stringify({ model, prompt: text }),
      });
      embeddings.push(data.embedding ?? []);
    }
    return embeddings;
  }
}
