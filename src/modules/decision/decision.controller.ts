import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DecisionService } from './decision.service.js';
import { DecisionValidator } from './decision.validator.js';
import { DecisionResponse } from './decision.type.js';

@Controller()
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Post('decision')
  @HttpCode(HttpStatus.OK)
  async createDecision(@Body() body: unknown): Promise<DecisionResponse> {
    return this.decisionService.decide(DecisionValidator.parse(body));
  }
}
