import { Injectable } from '@nestjs/common';
import { OpenRouterService } from '../openrouter/openrouter.service.js';
import { JevK5Service } from './jevk5.service.js';
import { ProbabilityUtil } from '../../utils/probability.util.js';
import { OLLAMA_PROVIDER, OPENROUTER_MODEL_PATTERN, OPENROUTER_SYSTEM_ONE_ENDPOINT } from './decision.constants.js';
import { DecisionRequest, DecisionResponse } from './decision.type.js';

@Injectable()
export class DecisionService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly jevK5Service: JevK5Service,
  ) {}

  async decide(request: DecisionRequest): Promise<DecisionResponse> {
    if (OPENROUTER_MODEL_PATTERN.test(request.model)) {
      return this.openRouterService.post<DecisionResponse>(OPENROUTER_SYSTEM_ONE_ENDPOINT, request);
    }

    const decisions = await Promise.all(Object.entries(request.questions).map(async ([id, question]) =>
      ({ id, decision: await this.jevK5Service.decide(request.model, request.state, question) })));

    return {
      id: `dec-${crypto.randomUUID()}`,
      model: request.model,
      provider: OLLAMA_PROVIDER,
      answers: Object.fromEntries(decisions.map(({ id, decision }) => [id, decision.answer])),
      usage: {
        input_tokens: ProbabilityUtil.sum(decisions.map(({ decision }) => decision.inputTokens)),
        output_tokens: 0,
      },
    };
  }
}
