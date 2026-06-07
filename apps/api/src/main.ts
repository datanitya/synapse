import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Refuse to start in production with insecure defaults
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    const encKey = process.env.AUTH_ENCRYPTION_KEY;
    if (!jwtSecret || jwtSecret === 'dev-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set to a strong random value in production');
    }
    if (!encKey || encKey === '0'.repeat(64)) {
      throw new Error('AUTH_ENCRYPTION_KEY must be set to a 64-char hex string in production');
    }
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS must be configured before helmet so its headers aren't overridden
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  });

  // crossOriginResourcePolicy: false — allows the browser to fetch this API
  // from a different port (3000 → 3001) without being blocked
  app.use(helmet({ crossOriginResourcePolicy: false }));

  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`SYNAPSE API running on http://localhost:${port}/api`);
}

bootstrap();
