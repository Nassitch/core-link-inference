export class DateUtil {
  private static readonly MILLISECONDS_PER_SECOND = 1000;

  static seconds(value: number): number {
    return value * DateUtil.MILLISECONDS_PER_SECOND;
  }
}
