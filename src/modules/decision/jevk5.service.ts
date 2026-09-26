import { Injectable } from '@nestjs/common';
import { OllamaService } from '../ollama/ollama.service.js';
import { JsonUtil } from '../../utils/json.util.js';
import { ProbabilityUtil } from '../../utils/probability.util.js';
import {
  JEVK5_DEFAULT_KNOCKOUT_TEMPERATURE,
  JEVK5_DEFAULT_TEMPERATURE,
  JEVK5_LETTERS,
  JEVK5_MISSING_LOGPROB_MARGIN,
  JEVK5_PROMPT_TEMPLATE,
  JEVK5_SYSTEM_PROMPT,
  NOUL_DEFAULT_CRITERIA,
  NOUL_OPTION_IDS,
  OLLAMA_MAX_TOP_LOGPROBS,
} from './decision.constants.js';
import {
  DecisionAnswer,
  DecisionOption,
  DecisionQuestion,
  Description,
  FinalistPosition,
  LetterReader,
  LetterReadout,
  QuestionDecision,
} from './decision.type.js';

@Injectable()
export class JevK5Service {
  private readonly temperature: number = Number(process.env.JEVK5_TEMPERATURE ?? JEVK5_DEFAULT_TEMPERATURE);
  private readonly knockoutTemperature: number = Number(process.env.JEVK5_KNOCKOUT_TEMPERATURE ?? JEVK5_DEFAULT_KNOCKOUT_TEMPERATURE);

  constructor(private readonly ollamaService: OllamaService) {}

  async decide(model: string, state: Description, question: DecisionQuestion): Promise<QuestionDecision> {
    const options = this.options(question);
    let inputTokens = 0;

    const read: LetterReader = async (texts) => {
      const readout = await this.readLetters(model, this.prompt(state, question.instructions, texts), texts.length);
      inputTokens += readout.inputTokens;
      return readout.probabilities;
    };

    const probabilities = await this.spread(read, options.map((option) => option.text));
    const distribution = Object.fromEntries(options.map((option, index) => [option.id, probabilities[index]]));
    return { answer: this.answer(question, distribution), inputTokens };
  }

  private options(question: DecisionQuestion): DecisionOption[] {
    return this.optionDescriptions(question)
      .map(([id, description]) => ({ id, text: `${id}: ${JsonUtil.toText(description)}` }));
  }

  private optionDescriptions(question: DecisionQuestion): [string, Description][] {
    switch (question.type) {
      case 'noul':
        return NOUL_OPTION_IDS.map((id) => [id, question.criteria?.[id] ?? NOUL_DEFAULT_CRITERIA[id]]);
      case 'choice':
        return Object.entries(question.criteria).map(([id, description]) => [id, description ?? id]);
      case 'score':
        return question.criteria.map((level, index) => [String(index), level]);
    }
  }

  private prompt(state: Description, criterion: Description, texts: string[]): string {
    const user = JsonUtil.stringifyPythonStyle({
      evidence: state,
      criterion,
      options: texts.map((description, index) => ({ letter: JEVK5_LETTERS[index], description })),
    });
    return JEVK5_PROMPT_TEMPLATE
      .replace('{system}', () => JEVK5_SYSTEM_PROMPT)
      .replace('{user}', () => user);
  }

  private async readLetters(model: string, prompt: string, count: number): Promise<LetterReadout> {
    const data = await this.ollamaService.nextTokenLogprobs(model, prompt, OLLAMA_MAX_TOP_LOGPROBS);
    const seen = new Map((data.logprobs?.[0]?.top_logprobs ?? []).map((entry) => [entry.token, entry.logprob]));
    const floor = seen.size > 0 ? Math.min(...seen.values()) - JEVK5_MISSING_LOGPROB_MARGIN : 0;
    const logprobs = Array.from({ length: count }, (_, index) => seen.get(JEVK5_LETTERS[index]) ?? floor);
    return {
      probabilities: ProbabilityUtil.softmax(logprobs, this.temperature),
      inputTokens: data.prompt_eval_count ?? 0,
    };
  }

  private async spread(read: LetterReader, texts: string[]): Promise<number[]> {
    if (texts.length <= JEVK5_LETTERS.length) {
      return read(texts);
    }
    return ProbabilityUtil.sharpen(await this.knockout(read, texts), this.knockoutTemperature);
  }

  private async knockout(read: LetterReader, texts: string[]): Promise<number[]> {
    const runs = this.groups(texts.length, Math.ceil(texts.length / JEVK5_LETTERS.length));
    const inner = await Promise.all(runs.map((run) => read(run.map((index) => texts[index]))));
    const keep = Math.max(1, Math.floor(JEVK5_LETTERS.length / runs.length));

    const ranked = inner.map((probabilities) => probabilities.map((_, index) => index)
      .sort((a, b) => probabilities[b] - probabilities[a]));
    const chosen = ranked.flatMap((order, group) => order.slice(0, keep).map((index) => ({ group, index })));
    const rest = ranked.flatMap((order, group) => order.slice(keep).map((index) => ({ group, index })))
      .sort((a, b) => inner[b.group][b.index] - inner[a.group][a.index]);
    const finalists: FinalistPosition[] = [...chosen, ...rest.slice(0, Math.max(0, JEVK5_LETTERS.length - chosen.length))];

    const tops = runs.map((_, group) => finalists
      .filter((finalist) => finalist.group === group)
      .map((finalist) => finalist.index)
      .sort((a, b) => a - b));
    const final = await read(tops.flatMap((top, group) => top.map((index) => texts[runs[group][index]])));

    let offset = 0;
    const shares = tops.map((top) => {
      const share = new Map(top.map((index, position) => [index, final[offset + position]]));
      offset += top.length;
      return share;
    });

    const inFinal = ProbabilityUtil.sum(shares.map((share, group) =>
      ProbabilityUtil.sum([...share.values()]) * ProbabilityUtil.sum([...share.keys()].map((index) => inner[group][index]))));

    return ProbabilityUtil.normalize(inner.flatMap((probabilities, group) => {
      const mass = ProbabilityUtil.sum([...shares[group].values()]);
      return probabilities.map((probability, index) => {
        const finalShare = shares[group].get(index);
        return finalShare === undefined ? mass * probability : finalShare * inFinal;
      });
    }));
  }

  private groups(size: number, count: number): number[][] {
    const base = Math.floor(size / count);
    const extra = size % count;
    let start = 0;
    return Array.from({ length: count }, (_, group) => {
      const length = base + (group < extra ? 1 : 0);
      const run = Array.from({ length }, (_, offset) => start + offset);
      start += length;
      return run;
    });
  }

  private answer(question: DecisionQuestion, probabilities: Record<string, number>): DecisionAnswer {
    const values = Object.values(probabilities);
    switch (question.type) {
      case 'noul':
        return { type: 'noul', noul: probabilities.true };
      case 'choice':
        return {
          type: 'choice',
          choice: Object.keys(probabilities).reduce((best, id) => probabilities[id] > probabilities[best] ? id : best),
          probabilities,
          confidence: ProbabilityUtil.confidence(values),
        };
      case 'score':
        return {
          type: 'score',
          score: ProbabilityUtil.sum(Object.entries(probabilities).map(([level, probability]) => Number(level) * probability)),
          legend: Object.fromEntries(question.criteria.map((level, index) => [String(index), level])),
          probabilities,
          confidence: ProbabilityUtil.confidence(values),
        };
    }
  }
}
