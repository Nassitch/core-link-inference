import {Controller, Post, Get, Body, Res, Param, HttpException, HttpStatus} from '@nestjs/common';
import type {Response} from 'express';
import {OllamaService} from '../ollama/ollama.service.js';
import {OpenAIService} from './openai.service.js';
import type {ChatCompletionRequest, ChatCompletionResponse, ChatMessage} from '../../types/openai.ts';
import type {OpenAIRequestType} from '../../types/openai.mod.ts';

@Controller('v1')
export class OpenAIController {
    constructor(
        private readonly ollamaService: OllamaService,
        private readonly openaiService: OpenAIService,
    ) {
    }

    @Post('chat/completions')
    public async chatCompletion(@Body() body: ChatCompletionRequest, @Res() res: Response): Promise<any> {
        const {model, messages, stream = false} = body;

        if (!model || !messages?.length) {
            throw new HttpException({
                error: {message: 'model and messages are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            return this.openaiService.handleStream(model, messages, res);
        }

        const response: ChatCompletionResponse = await this.openaiService.chatCompletion(body);
        return res.json(response);
    }

    @Post('responses')
    public async createResponse(@Body() body: OpenAIRequestType, @Res() res: Response): Promise<any> {
        const {model, input, stream = false} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        const messages: ChatMessage[] = this.openaiService.convertInputToMessages(input);

        if (stream) {
            return this.openaiService.handleResponseStream(model, messages, res);
        }

        const content: string = await this.ollamaService.chatCompletion(model, messages);
        const responseId = `resp-${crypto.randomUUID()}`;

        return res.json({
            id: responseId,
            object: 'response',
            created_at: Math.floor(Date.now() / 1000),
            model,
            output: [{
                type: 'message',
                id: `msg-${crypto.randomUUID()}`,
                role: 'assistant',
                content: [{type: 'output_text', text: content}],
            }],
            usage: {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
            },
            status: 'completed',
        });
    }

    @Get('models')
    public async listModels(): Promise<any> {
        return this.openaiService.listModels();
    }

    @Get('models/:modelId')
    public async getModel(@Param('modelId') modelId: string, @Res() res: Response): Promise<any> {
        const response = await this.openaiService.getModel(modelId);
        return res.json(response);
    }

    @Post('completions')
    public async textCompletion(@Body() body: OpenAIRequestType, @Res() res: Response): Promise<any> {
        const {model, prompt, stream = false} = body;

        if (!model || !prompt) {
            throw new HttpException({
                error: {message: 'model and prompt are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        if (stream) {
            return this.openaiService.handleTextCompletionStream(model, [{role: 'user', content: prompt}], res);
        }

        const response: ChatCompletionResponse = await this.openaiService.textCompletion(body);
        return res.json(response);
    }

    @Post('embeddings')
    public async createEmbeddings(@Body() body: OpenAIRequestType): Promise<any> {
        const {model, input} = body;

        if (!model || !input) {
            throw new HttpException({
                error: {message: 'model and input are required', type: 'invalid_request_error'},
            }, HttpStatus.BAD_REQUEST);
        }

        return this.openaiService.generateEmbeddings({model, input});
    }
}