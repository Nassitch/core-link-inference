import { HealthController } from '../src/modules/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('health', () => {
    it('should return health status with ok', () => {
      const result = controller.health();

      expect(result.status).toBe('ok');
    });

    it('should return health status with version', () => {
      const result = controller.health();

      expect(result.version).toBe('1.0.0');
    });

    it('should return health status with valid timestamp', () => {
      const before = new Date().toISOString();
      const result = controller.health();
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });

    it('should return all required fields', () => {
      const result = controller.health();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
    });
  });
});
