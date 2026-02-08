export interface OllamaChatResponse {
    message: {
        role: string;
        content: string;
        tool_calls?: Array<{
            function: {
                name: string;
                arguments: Record<string, unknown>;
            };
        }>;
    };
    done: boolean;
}