import {Controller, Post, Get, Body, Param, Res, HttpException, HttpStatus} from '@nestjs/common';
import type {FastifyReply} from 'fastify';
import {OllamaService} from '../ollama/ollama.service.js';
import {OpenAIService} from './openai.service.js';
import type {
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    OpenAIModel,
    OpenAIModelList,
    OpenAIEmbeddingResponse
} from '../../types/openai.ts';
import type {OpenAIRequestType} from '../../types/openai.mod.ts';
import type {ResponseType} from '../../types/response.ts';
import {OllamaChatResponse} from "../../types/ollama";

@Controller('v1')
export class OpenAIController {
    constructor(
        private readonly ollamaService: OllamaService,
        private readonly openaiService: OpenAIService,
    ) {
    }

    @Post('chat/completions')
    public async chatCompletion(
        @Body() body: ChatCompletionRequest,
        @Res({passthrough: true}) reply: FastifyReply,
    ): Promise<ChatCompletionResponse | void> {
        const {model, messages, stream = false} = body;

        if (!model || !messages?.length) {
            throw new HttpException({
                error: {message: 'model and messages are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            await this.openaiService.chatCompletionStream(body, reply.raw);
            return;
        }

        return await this.openaiService.chatCompletion(body);
    }

    @Post('responses')
    public async createResponse(
        @Body() body: OpenAIRequestType,
        @Res({passthrough: true}) reply: FastifyReply,
    ): Promise<ResponseType | void> {
        const {model, input, stream = false} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        const messages: ChatMessage[] = this.openaiService.convertInputToMessages(input);

        if (stream) {
            await this.openaiService.responseStream(model, messages, reply.raw);
            return;
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
    public async listModels(): Promise<OpenAIModelList> {
        return this.openaiService.listModels();
    }

    @Get('models/:modelId')
    public async getModel(@Param('modelId') modelId: string): Promise<OpenAIModel> {
        const model = await this.openaiService.getModel(modelId);
        if (!model) {
            throw new HttpException({
                error: {
                    message: `The model '${modelId}' does not exist`,
                    type: 'invalid_request_error',
                    param: null,
                    code: 'model_not_found'
                },
            }, HttpStatus.NOT_FOUND);
        }
        return model;
    }

    @Post('completions')
    public async textCompletion(
        @Body() body: OpenAIRequestType,
        @Res({passthrough: true}) reply: FastifyReply,
    ): Promise<ChatCompletionResponse | void> {
        const {model, prompt, stream = false} = body;

        if (!model || !prompt) {
            throw new HttpException({
                error: {message: 'model and prompt are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            await this.openaiService.textCompletionStream(body, reply.raw);
            return;
        }

        return await this.openaiService.textCompletion(body);
    }

    @Post('embeddings')
    public async createEmbeddings(@Body() body: OpenAIRequestType): Promise<OpenAIEmbeddingResponse> {
        const {model, input} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        return this.openaiService.generateEmbeddings({model, input});
    }
}
