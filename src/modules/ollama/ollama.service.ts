import { Injectable } from '@nestjs/common';
import { EnvironmentConfig } from '../../config/environment.config.js';

@Injectable()
export class OllamaService {
    private readonly baseUrl: string;
    private readonly timeout: number = 120000;

    constructor(private readonly config: EnvironmentConfig) {
        this.baseUrl = config.ollamaUrl;
    }

    private async request(endpoint: string, options?: RequestInit): Promise<any> {
        const response: Response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {'Content-Type': 'application/json', ...options?.headers},
            body: options?.body,
            method: options?.method,
            signal: AbortSignal.timeout(this.timeout),
        });
        return response.json();
    }

    public async chatCompletion(model: string, messages: any[]): Promise<string> {
        const data = await this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify({model, messages, stream: false}),
        });
        return data.message?.content ?? '';
    }

    public async chatCompletionStream(model: string, messages: any[]): Promise<NodeJS.ReadableStream> {
        const response: Response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model, messages, stream: true}),
            signal: AbortSignal.timeout(this.timeout),
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const textDecoder = new TextDecoder();
        const textEncoder = new TextEncoder();
        let buffer: string = '';

        const nodeStream = new ReadableStream({
            async start(controller): Promise<void> {
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) {
                        if (buffer) controller.enqueue(textEncoder.encode(buffer));
                        controller.close();
                        break;
                    }
                    buffer += textDecoder.decode(value);
                    const lines: string[] = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    lines.forEach((line: string): void => {
                        if (line.trim()) {
                            try {
                                const parsed = JSON.parse(line);
                                controller.enqueue(textEncoder.encode(JSON.stringify(parsed)).buffer);
                            } catch {
                            }
                        }
                    });
                }
            }
        });

        return nodeStream as unknown as NodeJS.ReadableStream;
    }

    public async listModels(): Promise<any[]> {
        const data = await this.request('/api/tags');
        return data.models ?? [];
    }

    public async generateEmbeddings(model: string, input: string | string[]): Promise<number[][]> {
        const inputs: string[] = Array.isArray(input) ? input : [input];
        const embeddings: number[][] = [];
        for (const text of inputs) {
            const data = await this.request('/api/embeddings', {
                method: 'POST',
                body: JSON.stringify({model, prompt: text}),
            });
            embeddings.push(data.embedding ?? []);
        }
        return embeddings;
    }
}
