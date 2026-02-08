import {Controller, Post, Get, Body, Param, HttpException, HttpStatus} from '@nestjs/common';
import {OllamaService} from '../ollama/ollama.service.js';
import {OpenAIService} from './openai.service.js';
import type {ChatCompletionRequest, ChatCompletionResponse, ChatMessage} from '../../types/openai.ts';
import type {OpenAIRequestType} from '../../types/openai.mod.ts';
import type {ErrorType, ResponseType} from '../../types/response.ts';
import {OllamaChatResponse} from "../../types/ollama";

@Controller('v1')
export class OpenAIController {
    constructor(
        private readonly ollamaService: OllamaService,
        private readonly openaiService: OpenAIService,
    ) {
    }

    @Post('chat/completions')
    public async chatCompletion(@Body() body: ChatCompletionRequest): Promise<ChatCompletionResponse | ErrorType> {
        const {model, messages, stream = false} = body;

        if (!model || !messages?.length) {
            throw new HttpException({
                error: {message: 'model and messages are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            return {error: 'Streaming not yet implemented for Fastify'};
        }

        return await this.openaiService.chatCompletion(body);
    }

    @Post('responses')
    public async createResponse(@Body() body: OpenAIRequestType): Promise<ResponseType | ErrorType> {
        const {model, input, stream = false} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        const messages: ChatMessage[] = this.openaiService.convertInputToMessages(input);

        if (stream) {
            return {error: 'Streaming not yet implemented for Fastify'};
        }

        const ollamaResponse: OllamaChatResponse = await this.ollamaService.chatCompletion(model, messages);
        const responseId = `resp-${crypto.randomUUID()}`;

        return {
            id: responseId,
            object: 'response',
            created_at: Math.floor(Date.now() / 1000),
            model,
            output: [{
                type: 'message',
                id: `msg-${crypto.randomUUID()}`,
                role: 'assistant',
                content: [{type: 'output_text', text: ollamaResponse.message.content}],
            }],
            usage: {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
            },
            status: 'completed',
        };
    }

    @Get('models')
    public async listModels(): Promise<{ name: string }[]> {
        return this.openaiService.listModels();
    }

    @Get('models/:modelId')
    public async getModel(@Param('modelId') modelId: string): Promise<{ name: string } | undefined> {
        return this.openaiService.getModel(modelId);
    }

    @Post('completions')
    public async textCompletion(@Body() body: OpenAIRequestType): Promise<ChatCompletionResponse | ErrorType> {
        const {model, prompt, stream = false} = body;

        if (!model || !prompt) {
            throw new HttpException({
                error: {message: 'model and prompt are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            return {error: 'Streaming not yet implemented for Fastify'};
        }

        return await this.openaiService.textCompletion(body);
    }

    @Post('embeddings')
    public async createEmbeddings(@Body() body: OpenAIRequestType): Promise<number[][]> {
        const {model, input} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        return this.openaiService.generateEmbeddings({model, input});
    }
}
