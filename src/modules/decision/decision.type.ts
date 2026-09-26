import { JsonObject, JsonValue } from '../../utils/json.type.js';
import { DECISION_TYPES, NOUL_OPTION_IDS } from './decision.constants.js';

export type Description = string | JsonValue[] | JsonObject;

export type DecisionType = typeof DECISION_TYPES[number];

export type NoulOptionId = typeof NOUL_OPTION_IDS[number];

export interface NoulQuestion {
  type: 'noul';
  instructions: Description;
  criteria?: Record<NoulOptionId, Description>;
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: Description;
  criteria: Record<string, Description | null>;
}

export interface ScoreQuestion {
  type: 'score';
  instructions: Description;
  criteria: Description[];
}

export type DecisionQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface DecisionRequest {
  model: string;
  state: Description;
  questions: Record<string, DecisionQuestion>;
}

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: 'score';
  score: number;
  legend: Record<string, Description>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type DecisionAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface DecisionUsage {
  input_tokens: number;
  output_tokens: number;
  cost?: number;
}

export interface DecisionResponse {
  id: string;
  model: string;
  provider: string;
  answers: Record<string, DecisionAnswer>;
  usage: DecisionUsage;
}

export interface DecisionOption {
  id: string;
  text: string;
}

export interface QuestionDecision {
  answer: DecisionAnswer;
  inputTokens: number;
}

export interface LetterReadout {
  probabilities: number[];
  inputTokens: number;
}

export type LetterReader = (texts: string[]) => Promise<number[]>;

export interface FinalistPosition {
  group: number;
  index: number;
}
