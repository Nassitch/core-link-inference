import { Controller, Post, Get, Body, Res, Param, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { OllamaService } from '../ollama/ollama.service.js';

@Controller('v1')
export class OpenAIController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Post('chat/completions')
  async chatCompletion(@Body() body: any, @Res() res: Response) {
    const { model, messages, stream = false } = body;

    if (!model || !messages?.length) {
      throw new HttpException({
        error: { message: 'model and messages are required', type: 'invalid_request_error' },
      }, HttpStatus.BAD_REQUEST);
    }

    if (stream) {
      return this.handleStream(res, model, messages);
    }

    const content = await this.ollamaService.chatCompletion(model, messages);
    return res.json({
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  }

  @Post('responses')
  async createResponse(@Body() body: any, @Res() res: Response) {
    const { model, input, stream = false } = body;

    if (!model || !input) {
      throw new HttpException({
        error: { message: 'model and input are required', type: 'invalid_request_error' },
      }, HttpStatus.BAD_REQUEST);
    }

    const messages = this.convertInputToMessages(input);

    if (stream) {
      return this.handleResponseStream(res, model, messages);
    }

    const content = await this.ollamaService.chatCompletion(model, messages);
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
        content: [{ type: 'output_text', text: content }],
      }],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
      },
      status: 'completed',
    });
  }

  private convertInputToMessages(input: any): any[] {
    if (typeof input === 'string') {
      return [{ role: 'user', content: input }];
    }
    if (Array.isArray(input)) {
      return input.map((item: any) => {
        if (typeof item === 'string') {
          return { role: 'user', content: item };
        }
        if (item.role && item.content) {
          return item;
        }
        if (item.type === 'message' && item.content) {
          const textContent = Array.isArray(item.content)
            ? item.content.map((c: any) => c.text || c).join('')
            : item.content;
          return { role: item.role || 'user', content: textContent };
        }
        return { role: 'user', content: JSON.stringify(item) };
      });
    }
    return [{ role: 'user', content: JSON.stringify(input) }];
  }

  private async handleResponseStream(res: Response, model: string, messages: any[]) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ollamaService.chatCompletionStream(model, messages);
    const responseId = `resp-${crypto.randomUUID()}`;
    let buffer = '';

    res.write(`data: ${JSON.stringify({ type: 'response.created', response: { id: responseId, object: 'response', status: 'in_progress' } })}\n\n`);

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            res.write(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: parsed.message.content })}\n\n`);
          }
          if (parsed.done) {
            res.write(`data: ${JSON.stringify({ type: 'response.completed', response: { id: responseId, status: 'completed' } })}\n\n`);
          }
        } catch {}
      }
    });

    stream.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', () => {
      res.end();
    });
  }

  @Get('models')
  async listModels() {
    const models = await this.ollamaService.listModels();
    return {
      object: 'list',
      data: models.map((m: any) => ({
        id: m.name,
        object: 'model',
        created: Math.floor(new Date(m.modified_at).getTime() / 1000) || 0,
        owned_by: 'local',
      })),
    };
  }

  @Get('models/:modelId')
  async getModel(@Param('modelId') modelId: string) {
    const models = await this.ollamaService.listModels();
    const model = models.find((m: any) => m.name === modelId);

    if (!model) {
      throw new HttpException({
        error: { message: `Model '${modelId}' not found`, type: 'invalid_request_error', code: 'model_not_found' },
      }, HttpStatus.NOT_FOUND);
    }

    return {
      id: model.name,
      object: 'model',
      created: Math.floor(new Date(model.modified_at).getTime() / 1000) || 0,
      owned_by: 'local',
    };
  }

  @Post('completions')
  async textCompletion(@Body() body: any, @Res() res: Response) {
    const { model, prompt, stream = false } = body;

    if (!model || !prompt) {
      throw new HttpException({
        error: { message: 'model and prompt are required', type: 'invalid_request_error' },
      }, HttpStatus.BAD_REQUEST);
    }

    const messages = [{ role: 'user', content: prompt }];

    if (stream) {
      return this.handleTextCompletionStream(res, model, messages);
    }

    const content = await this.ollamaService.chatCompletion(model, messages);
    return res.json({
      id: `cmpl-${crypto.randomUUID()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        text: content,
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  }

  @Post('embeddings')
  async createEmbeddings(@Body() body: any) {
    const { model, input } = body;

    if (!model || !input) {
      throw new HttpException({
        error: { message: 'model and input are required', type: 'invalid_request_error' },
      }, HttpStatus.BAD_REQUEST);
    }

    const embeddings = await this.ollamaService.generateEmbeddings(model, input);
    const inputs = Array.isArray(input) ? input : [input];

    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model,
      usage: {
        prompt_tokens: inputs.reduce((acc, text) => acc + text.length, 0),
        total_tokens: inputs.reduce((acc, text) => acc + text.length, 0),
      },
    };
  }

  private async handleTextCompletionStream(res: Response, model: string, messages: any[]) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ollamaService.chatCompletionStream(model, messages);
    const id = `cmpl-${crypto.randomUUID()}`;
    let buffer = '';

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const event = {
            id,
            object: 'text_completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              text: parsed.message?.content ?? '',
              finish_reason: parsed.done ? 'stop' : null,
            }],
          };
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {}
      }
    });

    stream.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', () => {
      res.end();
    });
  }

  private async handleStream(res: Response, model: string, messages: any[]) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ollamaService.chatCompletionStream(model, messages);
    const id = `chatcmpl-${crypto.randomUUID()}`;
    let buffer = '';

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const delta: any = {};
          if (parsed.message?.content) {
            delta.content = parsed.message.content;
          }
          const event = {
            id,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              delta,
              finish_reason: parsed.done ? 'stop' : null,
            }],
          };
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {}
      }
    });

    stream.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', () => {
      res.end();
    });
  }
}
