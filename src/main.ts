import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AuthGuard } from './guards/auth.guard.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalGuards(new AuthGuard());

  app.use((req: any, res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });

  await app.listen(process.env.PORT ?? 8000, process.env.HOST ?? '0.0.0.0');
}

bootstrap();
