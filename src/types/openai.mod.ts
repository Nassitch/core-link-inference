import type {ChatMessage} from './openai.ts';

export type OpenAIType = 'chat' | 'text_completion' | 'responses' | 'embeddings';

export interface OpenAIRequestType {
    model: string;
    messages?: ChatMessage[];
    stream?: boolean;
    prompt?: string;
    input?: string | any[];
    type?: OpenAIType;
    temperature?: number;
}