export interface OllamaTokenLogprob {
  token: string;
  logprob: number;
  bytes: number[];
}

export interface OllamaLogprob extends OllamaTokenLogprob {
  top_logprobs: OllamaTokenLogprob[];
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  prompt_eval_count?: number;
  logprobs?: OllamaLogprob[];
  error?: string;
}
