import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { EnvironmentConfig } from '../config/environment.config.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: EnvironmentConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authorization.slice(7);
    if (token !== this.config.apiKey) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
