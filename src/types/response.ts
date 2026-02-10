export interface ResponseType {
    id: string;
    object: 'response';
    created_at: number;
    model: string;
    output: Array<{
        type: 'message';
        id: string;
        role: 'assistant';
        content: Array<{
            type: 'output_text';
            text: string;
        }>;
    }>;
    usage: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
    };
    status: 'completed';
}

export interface OpenAIError {
    error: {
        message: string;
        type: string;
        param: string | null;
        code: string | null;
    };
}