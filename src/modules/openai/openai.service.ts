import {Injectable} from '@nestjs/common';
import type {ChatMessage, ChatCompletionRequest, ChatCompletionResponse, ToolCall, OpenAIModel, OpenAIModelList, OpenAIEmbeddingResponse} from '../../types/openai.ts';
import type {OpenAIRequestType} from '../../types/openai.mod.ts';
import {OllamaService} from '../ollama/ollama.service.js';
import {OllamaChatResponse} from "../../types/ollama";

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
            system_fingerprint: 'fp_ollama',
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
            system_fingerprint: 'fp_ollama',
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

    public async listModels(): Promise<OpenAIModelList> {
        const models = await this.ollamaService.listModels();
        return {
            object: 'list',
            data: models.map((m: any): OpenAIModel => ({
                id: m.name,
                object: 'model',
                created: m.modified_at ? Math.floor(new Date(m.modified_at).getTime() / 1000) : 0,
                owned_by: 'ollama',
            })),
        };
    }

    public async getModel(modelId: string): Promise<OpenAIModel | undefined> {
        const list = await this.listModels();
        return list.data.find((m: OpenAIModel): boolean => m.id === modelId);
    }

    public async generateEmbeddings(
        request: { model: string; input: string | string[] },
    ): Promise<OpenAIEmbeddingResponse> {
        const {model, input} = request;
        const embeddings = await this.ollamaService.generateEmbeddings(model, input);
        return {
            object: 'list',
            data: embeddings.map((embedding, index) => ({
                object: 'embedding' as const,
                embedding,
                index,
            })),
            model,
            usage: {
                prompt_tokens: 0,
                total_tokens: 0,
            },
        };
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

}
