import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../src/guards/auth.guard';
import { EnvironmentConfig } from '../src/config/environment.config';

const mockConfig: EnvironmentConfig = {
  apiKey: 'valid-api-key',
  host: '0.0.0.0',
  port: 8000,
  ollamaUrl: 'http://localhost:11434',
  corsOrigin: '*',
};

const createMockExecutionContext = (authorization?: string): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({
      headers: { authorization },
    }),
  }),
}) as ExecutionContext;

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard(mockConfig);
  });

  describe('canActivate', () => {
    it('should return true for valid Bearer token', () => {
      const context = createMockExecutionContext('Bearer valid-api-key');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no authorization header', () => {
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when authorization does not start with Bearer', () => {
      const context = createMockExecutionContext('Basic valid-api-key');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', () => {
      const context = createMockExecutionContext('Bearer invalid-token');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty Bearer token', () => {
      const context = createMockExecutionContext('Bearer ');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
