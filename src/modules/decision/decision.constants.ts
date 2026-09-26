export const DECISION_TYPES = ['noul', 'choice', 'score'] as const;

export const NOUL_OPTION_IDS = ['true', 'false'] as const;

export const NOUL_DEFAULT_CRITERIA = {
  true: 'The proposition is true.',
  false: 'The proposition is false.',
};

export const CHOICE_MIN_OPTIONS = 2;

export const CHOICE_MAX_OPTIONS = 255;

export const SCORE_MIN_LEVELS = 2;

export const SCORE_MAX_LEVELS = 10;

export const OPENROUTER_MODEL_PATTERN = /^(~?typesafe\/|jev-)/;

export const OPENROUTER_SYSTEM_ONE_ENDPOINT = '/v1/systemone';

export const OLLAMA_PROVIDER = 'Ollama';

export const OLLAMA_MAX_TOP_LOGPROBS = 20;

export const JEVK5_LETTERS = 'ABCDEFGHIJKLMNOP';

export const JEVK5_DEFAULT_TEMPERATURE = 1.532;

export const JEVK5_DEFAULT_KNOCKOUT_TEMPERATURE = 0.77;

export const JEVK5_MISSING_LOGPROB_MARGIN = 2;

export const JEVK5_SYSTEM_PROMPT = 'Apply the supplied criterion to the supplied evidence. Choose exactly one listed option. '
  + 'Respond with only its uppercase letter, with no explanation or reasoning.';

export const JEVK5_PROMPT_TEMPLATE = '<|im_start|>system\n{system}<|im_end|>\n'
  + '<|im_start|>user\n{user}<|im_end|>\n'
  + '<|im_start|>assistant\n<think>\n\n</think>\n\n';

export const DESCRIPTION_FORMAT = 'a non-empty string, an object or an array';
