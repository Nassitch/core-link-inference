export class ProbabilityUtil {
  static sum(values: number[]): number {
    return values.reduce((acc, value) => acc + value, 0);
  }

  static normalize(values: number[]): number[] {
    const total = ProbabilityUtil.sum(values);
    return values.map((value) => value / total);
  }

  static softmax(logits: number[], temperature: number): number[] {
    const top = Math.max(...logits);
    return ProbabilityUtil.normalize(logits.map((logit) => Math.exp((logit - top) / temperature)));
  }

  static sharpen(probabilities: number[], temperature: number): number[] {
    return ProbabilityUtil.normalize(probabilities.map((probability) => probability ** (1 / temperature)));
  }

  static confidence(probabilities: number[]): number {
    const count = probabilities.length;
    const spread = (count * Math.max(...probabilities) - 1) / (count - 1);
    return Math.min(1, Math.max(0, spread));
  }
}
