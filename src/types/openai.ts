export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface ToolFunction {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
}

export interface Tool {
    type: 'function';
    function: ToolFunction;
}

export interface ChatMessage {
    role: MessageRole;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    stream?: boolean;
    tools?: Tool[];
    tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    system_fingerprint: string;
    choices: ChatCompletionChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ChatCompletionChoice {
    index: number;
    message?: ChatMessage;
    finish_reason?: string;
    text?: string;
}

export interface OpenAIModel {
    id: string;
    object: 'model';
    created: number;
    owned_by: string;
}

export interface OpenAIModelList {
    object: 'list';
    data: OpenAIModel[];
}

export interface OpenAIEmbeddingData {
    object: 'embedding';
    embedding: number[];
    index: number;
}

export interface OpenAIEmbeddingResponse {
    object: 'list';
    data: OpenAIEmbeddingData[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}
