import {Injectable} from '@nestjs/common';
import {EnvironmentConfig} from '../../config/environment.config.js';
import type {ChatMessage, Tool, ToolCall} from '../../types/openai.ts';
import type {OllamaChatResponse} from '../../types/ollama.ts';

@Injectable()
export class OllamaService {
    private readonly timeout: number = 120000;

    constructor(private readonly config: EnvironmentConfig) {
    }

    private async request(endpoint: string, options?: RequestInit): Promise<any> {
        const response: Response = await fetch(`${this.config.ollamaUrl}${endpoint}`, {
            headers: {'Content-Type': 'application/json', ...options?.headers},
            body: options?.body,
            method: options?.method,
            signal: AbortSignal.timeout(this.timeout),
        });
        return response.json();
    }

    private formatMessagesForOllama(messages: ChatMessage[]): any[] {
        return messages.map((msg: ChatMessage) => {
            if (msg.role === 'tool') {
                return {
                    role: 'tool',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                    tool_call_id: msg.tool_call_id,
                };
            }

            if (msg.role === 'assistant' && msg.tool_calls?.length) {
                return {
                    role: 'assistant',
                    content: msg.content || '',
                    tool_calls: msg.tool_calls.map((tc: ToolCall) => ({
                        function: {
                            name: tc.function.name,
                            arguments: typeof tc.function.arguments === 'string'
                                ? JSON.parse(tc.function.arguments)
                                : tc.function.arguments,
                        },
                    })),
                };
            }

            return {
                role: msg.role,
                content: msg.content || '',
            };
        });
    }

    public async chatCompletion(
        model: string,
        messages: ChatMessage[],
        tools?: Tool[],
    ): Promise<OllamaChatResponse> {
        const formattedMessages = this.formatMessagesForOllama(messages);

        const body: Record<string, unknown> = {
            model,
            messages: formattedMessages,
            stream: false,
        };

        if (tools?.length) {
            body.tools = tools;
        }

        const data = await this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (data.error) {
            throw new Error(`Ollama error: ${data.error}`);
        }

        return {
            message: {
                role: data.message?.role ?? 'assistant',
                content: data.message?.content ?? '',
                tool_calls: data.message?.tool_calls,
            },
            done: data.done ?? true,
        };
    }

    public async* chatCompletionStream(
        model: string,
        messages: ChatMessage[],
    ): AsyncGenerator<Record<string, any>> {
        const formattedMessages = this.formatMessagesForOllama(messages);

        const response: Response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model, messages: formattedMessages, stream: true}),
            signal: AbortSignal.timeout(this.timeout),
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available on response body');

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        yield JSON.parse(line);
                    } catch {
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    yield JSON.parse(buffer);
                } catch {
                }
            }
        } finally {
            reader.releaseLock();
        }
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
