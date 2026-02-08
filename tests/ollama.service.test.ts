import { OllamaService } from '../src/modules/ollama/ollama.service';
import { EnvironmentConfig } from '../src/config/environment.config';

const mockConfig: EnvironmentConfig = {
  apiKey: 'test-api-key',
  host: '0.0.0.0',
  port: 8000,
  ollamaUrl: 'http://localhost:11434',
  corsOrigin: '*',
};

describe('OllamaService', () => {
  let service: OllamaService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new OllamaService(mockConfig);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('chatCompletion', () => {
    it('should return message content from response', async () => {
      const mockResponse = { message: { role: 'assistant', content: 'Hello, world!' }, done: true };
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      } as unknown as Response);

      const result = await service.chatCompletion('llama2', [{ role: 'user', content: 'Hi' }]);

      expect(result.message.content).toBe('Hello, world!');
      expect(result.message.role).toBe('assistant');
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return empty string when no content', async () => {
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response);

      const result = await service.chatCompletion('llama2', []);

      expect(result.message.content).toBe('');
    });

    it('should pass tools to Ollama when provided', async () => {
      const mockResponse = {
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'search', arguments: { query: 'test' } } }]
        },
        done: true
      };
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      } as unknown as Response);

      const tools = [{ type: 'function' as const, function: { name: 'search', description: 'Search the web' } }];
      const result = await service.chatCompletion('llama2', [{ role: 'user', content: 'Search for test' }], tools);

      expect(result.message.tool_calls).toBeDefined();
      expect(result.message.tool_calls?.[0].function.name).toBe('search');
      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(callBody.tools).toEqual(tools);
    });
  });

  describe('listModels', () => {
    it('should return models array', async () => {
      const mockModels = [{ name: 'llama2' }, { name: 'mistral' }];
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ models: mockModels }),
      } as unknown as Response);

      const result = await service.listModels();

      expect(result).toEqual(mockModels);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('should return empty array when no models', async () => {
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response);

      const result = await service.listModels();

      expect(result).toEqual([]);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for single input', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ embedding: mockEmbedding }),
      } as unknown as Response);

      const result = await service.generateEmbeddings('llama2', 'test text');

      expect(result).toEqual([mockEmbedding]);
    });

    it('should generate embeddings for multiple inputs', async () => {
      const mockEmbedding1 = [0.1, 0.2];
      const mockEmbedding2 = [0.3, 0.4];
      fetchSpy
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({ embedding: mockEmbedding1 }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({ embedding: mockEmbedding2 }),
        } as unknown as Response);

      const result = await service.generateEmbeddings('llama2', ['text1', 'text2']);

      expect(result).toEqual([mockEmbedding1, mockEmbedding2]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no embedding', async () => {
      fetchSpy.mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response);

      const result = await service.generateEmbeddings('llama2', 'test');

      expect(result).toEqual([[]]);
    });
  });
});
