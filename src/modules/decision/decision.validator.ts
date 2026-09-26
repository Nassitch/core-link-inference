import { HttpException, HttpStatus } from '@nestjs/common';
import {
  CHOICE_MAX_OPTIONS,
  CHOICE_MIN_OPTIONS,
  DECISION_TYPES,
  DESCRIPTION_FORMAT,
  NOUL_OPTION_IDS,
  SCORE_MAX_LEVELS,
  SCORE_MIN_LEVELS,
} from './decision.constants.js';
import { DecisionRequest } from './decision.type.js';

export class DecisionValidator {
  static parse(body: unknown): DecisionRequest {
    const errors = DecisionValidator.requestErrors(body);
    if (errors.length > 0) {
      throw new HttpException({
        error: { message: 'Invalid decision request', type: 'invalid_request_error', details: errors },
      }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    return body as DecisionRequest;
  }

  private static requestErrors(body: unknown): string[] {
    if (!DecisionValidator.isObject(body)) {
      return ['body: must be a JSON object'];
    }

    const errors: string[] = [];
    if (typeof body.model !== 'string' || !body.model.trim()) {
      errors.push('model: must be a non-empty string');
    }
    if (!DecisionValidator.isDescription(body.state)) {
      errors.push(`state: must be ${DESCRIPTION_FORMAT}`);
    }
    if (!DecisionValidator.isObject(body.questions) || Object.keys(body.questions).length === 0) {
      return [...errors, 'questions: must be a non-empty object'];
    }

    const questionErrors = Object.entries(body.questions)
      .flatMap(([id, question]) => DecisionValidator.questionErrors(`questions.${id}`, question));
    return [...errors, ...questionErrors];
  }

  private static questionErrors(path: string, question: unknown): string[] {
    if (!DecisionValidator.isObject(question)) {
      return [`${path}: must be an object`];
    }

    const errors = DecisionValidator.isDescription(question.instructions) ? [] : [`${path}.instructions: must be ${DESCRIPTION_FORMAT}`];
    const criteriaPath = `${path}.criteria`;

    switch (question.type) {
      case 'noul':
        return [...errors, ...DecisionValidator.noulCriteriaErrors(criteriaPath, question.criteria)];
      case 'choice':
        return [...errors, ...DecisionValidator.choiceCriteriaErrors(criteriaPath, question.criteria)];
      case 'score':
        return [...errors, ...DecisionValidator.scoreCriteriaErrors(criteriaPath, question.criteria)];
      default:
        return [...errors, `${path}.type: must be one of ${DECISION_TYPES.join(', ')}`];
    }
  }

  private static noulCriteriaErrors(path: string, criteria: unknown): string[] {
    if (criteria === undefined) {
      return [];
    }
    if (!DecisionValidator.isObject(criteria)) {
      return [`${path}: must be an object with "${NOUL_OPTION_IDS.join('" and "')}" descriptions`];
    }
    return NOUL_OPTION_IDS
      .filter((key) => !DecisionValidator.isDescription(criteria[key]))
      .map((key) => `${path}.${key}: must be ${DESCRIPTION_FORMAT}`);
  }

  private static choiceCriteriaErrors(path: string, criteria: unknown): string[] {
    if (!DecisionValidator.isObject(criteria)) {
      return [`${path}: must be an object mapping each option to its description`];
    }
    const entries = Object.entries(criteria);
    const descriptionErrors = entries
      .filter(([, description]) => description !== null && !DecisionValidator.isDescription(description))
      .map(([option]) => `${path}.${option}: must be null or ${DESCRIPTION_FORMAT}`);
    return [
      ...DecisionValidator.countErrors(path, entries.length, CHOICE_MIN_OPTIONS, CHOICE_MAX_OPTIONS, 'options'),
      ...descriptionErrors,
    ];
  }

  private static scoreCriteriaErrors(path: string, criteria: unknown): string[] {
    if (!Array.isArray(criteria)) {
      return [`${path}: must be an ordered array of level descriptions`];
    }
    const levelErrors = criteria
      .map((level, index) => DecisionValidator.isDescription(level) ? '' : `${path}.${index}: must be ${DESCRIPTION_FORMAT}`)
      .filter(Boolean);
    return [
      ...DecisionValidator.countErrors(path, criteria.length, SCORE_MIN_LEVELS, SCORE_MAX_LEVELS, 'levels'),
      ...levelErrors,
    ];
  }

  private static countErrors(path: string, count: number, min: number, max: number, unit: string): string[] {
    return count < min || count > max ? [`${path}: must contain between ${min} and ${max} ${unit} (received ${count})`] : [];
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isDescription(value: unknown): boolean {
    return (typeof value === 'string' && value.trim().length > 0) || Array.isArray(value) || DecisionValidator.isObject(value);
  }
}
