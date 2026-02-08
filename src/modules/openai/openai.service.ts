import {Injectable} from '@nestjs/common';
import type {ChatMessage, ChatCompletionRequest, ChatCompletionResponse, ToolCall} from '../../types/openai.ts';
import type {OpenAIRequestType} from '../../types/openai.mod.ts';
import {OllamaService} from '../ollama/ollama.service.js';
import type {Response} from 'express';
import {OllamaChatResponse} from "../../types/ollama";
import ReadableStream = NodeJS.ReadableStream;

@Injectable()
export class OpenAIService {
    constructor(private readonly ollamaService: OllamaService) {
    }

    public async chatCompletion(
        request: ChatCompletionRequest,
    ): Promise<ChatCompletionResponse> {
        const {model, messages, tools} = request;
        const ollamaResponse: OllamaChatResponse = await this.ollamaService.chatCompletion(model, messages, tools);

        const responseMessage: ChatMessage = {
            role: 'assistant',
            content: ollamaResponse.message.content || null,
        };

        let finishReason: string = 'stop';

        if (ollamaResponse.message.tool_calls?.length) {
            responseMessage.tool_calls = ollamaResponse.message.tool_calls.map((tc) => ({
                id: `call_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
                type: 'function' as const,
                function: {
                    name: tc.function.name,
                    arguments: typeof tc.function.arguments === 'string'
                        ? tc.function.arguments
                        : JSON.stringify(tc.function.arguments),
                },
            }));
            finishReason = 'tool_calls';
        }

        return {
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: responseMessage,
                finish_reason: finishReason,
            }],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }

    public async textCompletion(
        request: OpenAIRequestType,
    ): Promise<ChatCompletionResponse> {
        const {model, prompt} = request;
        const messages: ChatMessage[] = [{role: 'user', content: prompt}];
        const ollamaResponse: OllamaChatResponse = await this.ollamaService.chatCompletion(model, messages);
        return {
            id: `cmpl-${crypto.randomUUID()}`,
            object: 'text_completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                text: ollamaResponse.message.content,
                finish_reason: 'stop',
            }],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        };
    }

    public async listModels(): Promise<{ name: string }[]> {
        return this.ollamaService.listModels();
    }

    public async getModel(modelId: string): Promise<{ name: string } | undefined> {
        const models = await this.ollamaService.listModels();
        return models.find((model: { name: string }): boolean => model.name === modelId);
    }

    public async generateEmbeddings(
        request: { model: string; input: string | string[] },
    ): Promise<number[][]> {
        const {model, input} = request;
        return this.ollamaService.generateEmbeddings(model, input);
    }

    public convertInputToMessages(input: unknown): ChatMessage[] {
        if (typeof input === 'string') {
            return [{role: 'user', content: input}];
        }
        if (Array.isArray(input)) {
            return input.map((item) => {
                if (typeof item === 'string') {
                    return {role: 'user', content: item};
                }
                if (item.role && item.content) {
                    return item;
                }
                return {
                    role: item.role || 'user',
                    content: typeof item.content === 'string' ? item.content : JSON.stringify(item)
                };
            });
        }
        return [{role: 'user', content: JSON.stringify(input)}];
    }

    private async processStream(
        stream: any,
        res: Response,
        responseType: string,
        responseId: string,
        model: string,
        isResponseStream: boolean = false
    ): Promise<void> {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const id: string = responseId;
        let buffer: string = '';

        res.write(`data: ${JSON.stringify({
            type: 'response.created',
            response: {id: id, object: 'response', status: 'in_progress'}
        })}\n\n`);

        stream.on('data', (chunk: Buffer): void => {
            const chunkStr: string = chunk.toString();
            buffer += chunkStr;
            const lines: string[] = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.message?.content) {
                        let event: any;
                        if (isResponseStream) {
                            event = {
                                type: 'response.output_text.delta',
                                delta: parsed.message.content
                            };
                        } else {
                            event = {
                                id,
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{
                                    index: 0,
                                    delta: {content: parsed.message.content},
                                    finish_reason: parsed.done ? 'stop' : null,
                                }],
                            };
                        }
                        res.write(`data: ${JSON.stringify(event)}\n\n`);
                    }
                    if (parsed.done) {
                        res.write(`data: ${JSON.stringify({
                            type: 'response.completed',
                            response: {id: id, status: 'completed'}
                        })}\n\n`);
                    }
                } catch {
                }
            }
        });

        stream.on('end', (): void => {
            res.write('data: [DONE]\n\n');
            res.end();
        });

        stream.on('error', (): void => {
            res.end();
        });
    }

    private async processTextStream(
        stream: any,
        res: Response,
        id: string
    ): Promise<void> {
        let buffer: string = '';

        stream.on('data', (chunk: Buffer): void => {
            const chunkStr: string = chunk.toString();
            buffer += chunkStr;
            const lines: string[] = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    const event = {
                        id,
                        object: 'text_completion',
                        created: Math.floor(Date.now() / 1000),
                        model: '',
                        choices: [{
                            index: 0,
                            text: parsed.message?.content ?? '',
                            finish_reason: parsed.done ? 'stop' : null,
                        }],
                    };
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                } catch {
                }
            }
        });

        stream.on('end', (): void => {
            res.write('data: [DONE]\n\n');
            res.end();
        });

        stream.on('error', (): void => {
            res.end();
        });
    }

    public async handleStream(model: string, messages: ChatMessage[], res: Response): Promise<void> {
        const stream: ReadableStream = await this.ollamaService.chatCompletionStream(model, messages);
        await this.processStream(stream, res, 'chat.completion.chunk', `chatcmpl-${crypto.randomUUID()}`, model);
    }

    public async handleResponseStream(model: string, messages: ChatMessage[], res: Response): Promise<void> {
        const stream: ReadableStream = await this.ollamaService.chatCompletionStream(model, messages);
        await this.processStream(stream, res, 'response', `resp-${crypto.randomUUID()}`, model, true);
    }

    public async handleTextCompletionStream(model: string, messages: ChatMessage[], res: Response): Promise<void> {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream: ReadableStream = await this.ollamaService.chatCompletionStream(model, messages);
        const id = `cmpl-${crypto.randomUUID()}`;
        await this.processTextStream(stream, res, id);
    }
}
