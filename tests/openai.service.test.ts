import type {ServerResponse} from 'http';
import {OpenAIService} from '../src/modules/openai/openai.service';
import {OllamaService} from '../src/modules/ollama/ollama.service';
import {EnvironmentConfig} from '../src/config/environment.config';

const mockConfig: EnvironmentConfig = {
    apiKey: 'test-api-key',
    host: '0.0.0.0',
    port: 8000,
    ollamaUrl: 'http://localhost:11434',
    corsOrigin: '*',
};

describe('OpenAIService', (): void => {
    let service: OpenAIService;
    let ollamaService: OllamaService;
    let fetchSpy: jest.SpyInstance;

    beforeEach((): void => {
        ollamaService = new OllamaService(mockConfig);
        service = new OpenAIService(ollamaService);
        fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach((): void => {
        jest.restoreAllMocks();
    });

    describe('listModels', (): void => {
        it('should return OpenAI-formatted model list', async () => {
            const mockModels = [
                {name: 'llama2', modified_at: '2024-01-15T10:30:00Z'},
                {name: 'mistral', modified_at: '2024-02-20T14:00:00Z'},
            ];
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({models: mockModels}),
            } as unknown as Response);

            const result = await service.listModels();

            expect(result.object).toBe('list');
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toMatchObject({
                id: 'llama2',
                object: 'model',
                owned_by: 'ollama',
            });
            expect(typeof result.data[0].created).toBe('number');
            expect(result.data[1].id).toBe('mistral');
        });

        it('should handle models without modified_at', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({models: [{name: 'test'}]}),
            } as unknown as Response);

            const result = await service.listModels();

            expect(result.data[0].created).toBe(0);
        });
    });

    describe('getModel', () => {
        it('should return a single OpenAIModel when found', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({models: [{name: 'llama2', modified_at: '2024-01-15T10:30:00Z'}]}),
            } as unknown as Response);

            const result = await service.getModel('llama2');

            expect(result).toBeDefined();
            expect(result?.id).toBe('llama2');
            expect(result?.object).toBe('model');
            expect(result?.owned_by).toBe('ollama');
        });

        it('should return undefined when model not found', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({models: [{name: 'llama2'}]}),
            } as unknown as Response);

            const result = await service.getModel('nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('generateEmbeddings', () => {
        it('should return OpenAI-formatted embedding response', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({embedding: mockEmbedding}),
            } as unknown as Response);

            const result = await service.generateEmbeddings({model: 'llama2', input: 'test'});

            expect(result.object).toBe('list');
            expect(result.model).toBe('llama2');
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toMatchObject({
                object: 'embedding',
                embedding: mockEmbedding,
                index: 0,
            });
            expect(result.usage).toMatchObject({
                prompt_tokens: 0,
                total_tokens: 0,
            });
        });

        it('should handle multiple inputs', async () => {
            fetchSpy
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue({embedding: [0.1, 0.2]}),
                } as unknown as Response)
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue({embedding: [0.3, 0.4]}),
                } as unknown as Response);

            const result = await service.generateEmbeddings({model: 'llama2', input: ['text1', 'text2']});

            expect(result.data).toHaveLength(2);
            expect(result.data[0].index).toBe(0);
            expect(result.data[1].index).toBe(1);
        });
    });

    describe('chatCompletion', () => {
        it('should include system_fingerprint in response', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    message: {role: 'assistant', content: 'Hello!'},
                    done: true,
                }),
            } as unknown as Response);

            const result = await service.chatCompletion({
                model: 'llama2',
                messages: [{role: 'user', content: 'Hi'}],
            });

            expect(result.system_fingerprint).toBe('fp_ollama');
            expect(result.object).toBe('chat.completion');
            expect(result.id).toMatch(/^chatcmpl-/);
            expect(result.choices[0].message?.content).toBe('Hello!');
            expect(result.choices[0].finish_reason).toBe('stop');
        });

        it('should handle tool calls', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    message: {
                        role: 'assistant',
                        content: '',
                        tool_calls: [{function: {name: 'search', arguments: {query: 'test'}}}],
                    },
                    done: true,
                }),
            } as unknown as Response);

            const result = await service.chatCompletion({
                model: 'llama2',
                messages: [{role: 'user', content: 'Search'}],
                tools: [{type: 'function', function: {name: 'search'}}],
            });

            expect(result.choices[0].finish_reason).toBe('tool_calls');
            expect(result.choices[0].message?.tool_calls).toHaveLength(1);
            expect(result.choices[0].message?.tool_calls?.[0].type).toBe('function');
            expect(result.choices[0].message?.tool_calls?.[0].function.name).toBe('search');
        });
    });

    describe('textCompletion', () => {
        it('should include system_fingerprint in response', async () => {
            fetchSpy.mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    message: {role: 'assistant', content: 'Generated text'},
                    done: true,
                }),
            } as unknown as Response);

            const result = await service.textCompletion({model: 'llama2', prompt: 'Once upon'});

            expect(result.system_fingerprint).toBe('fp_ollama');
            expect(result.object).toBe('text_completion');
            expect(result.id).toMatch(/^cmpl-/);
            expect(result.choices[0].text).toBe('Generated text');
            expect(result.choices[0].finish_reason).toBe('stop');
        });
    });

    describe('chatCompletionStream', () => {
        function createMockRaw(): ServerResponse & { chunks: string[] } {
            const chunks: string[] = [];
            return {
                chunks,
                writeHead: jest.fn(),
                write: jest.fn((data: string) => {
                    chunks.push(data);
                    return true;
                }),
                end: jest.fn(),
            } as unknown as ServerResponse & { chunks: string[] };
        }

        async function* fakeOllamaStream(): AsyncGenerator<Record<string, any>> {
            yield {message: {role: 'assistant', content: 'Hello'}, done: false};
            yield {message: {role: 'assistant', content: ' world'}, done: false};
            yield {message: {role: 'assistant', content: ''}, done: true};
        }

        it('should write SSE chunks with correct format', async () => {
            jest.spyOn(ollamaService, 'chatCompletionStream').mockReturnValue(fakeOllamaStream());
            const raw = createMockRaw();

            await service.chatCompletionStream(
                {model: 'llama2', messages: [{role: 'user', content: 'Hi'}]},
                raw,
            );

            expect(raw.writeHead).toHaveBeenCalledWith(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            expect(raw.chunks.length).toBe(4);

            raw.chunks.slice(0, 3).forEach((chunk) => {
                expect(chunk).toMatch(/^data: \{.*\}\n\n$/);
            });

            expect(raw.chunks[3]).toBe('data: [DONE]\n\n');
            expect(raw.end).toHaveBeenCalled();
        });

        it('should set delta.role to assistant on first chunk', async () => {
            jest.spyOn(ollamaService, 'chatCompletionStream').mockReturnValue(fakeOllamaStream());
            const raw = createMockRaw();

            await service.chatCompletionStream(
                {model: 'llama2', messages: [{role: 'user', content: 'Hi'}]},
                raw,
            );

            const firstChunk = JSON.parse(raw.chunks[0].replace('data: ', '').trim());
            expect(firstChunk.choices[0].delta.role).toBe('assistant');
            expect(firstChunk.choices[0].delta.content).toBe('Hello');
        });

        it('should omit role in subsequent chunks', async () => {
            jest.spyOn(ollamaService, 'chatCompletionStream').mockReturnValue(fakeOllamaStream());
            const raw = createMockRaw();

            await service.chatCompletionStream(
                {model: 'llama2', messages: [{role: 'user', content: 'Hi'}]},
                raw,
            );

            const secondChunk = JSON.parse(raw.chunks[1].replace('data: ', '').trim());
            expect(secondChunk.choices[0].delta.role).toBeUndefined();
            expect(secondChunk.choices[0].delta.content).toBe(' world');
        });

        it('should include system_fingerprint in every chunk', async () => {
            jest.spyOn(ollamaService, 'chatCompletionStream').mockReturnValue(fakeOllamaStream());
            const raw = createMockRaw();

            await service.chatCompletionStream(
                {model: 'llama2', messages: [{role: 'user', content: 'Hi'}]},
                raw,
            );

            raw.chunks.slice(0, 3).forEach((chunk) => {
                const parsed = JSON.parse(chunk.replace('data: ', '').trim());
                expect(parsed.system_fingerprint).toBe('fp_ollama');
                expect(parsed.object).toBe('chat.completion.chunk');
            });
        });

        it('should set finish_reason to stop on final chunk', async () => {
            jest.spyOn(ollamaService, 'chatCompletionStream').mockReturnValue(fakeOllamaStream());
            const raw = createMockRaw();

            await service.chatCompletionStream(
                {model: 'llama2', messages: [{role: 'user', content: 'Hi'}]},
                raw,
            );

            const finalChunk = JSON.parse(raw.chunks[2].replace('data: ', '').trim());
            expect(finalChunk.choices[0].finish_reason).toBe('stop');
            expect(finalChunk.choices[0].delta).toEqual({});
        });
    });
});
