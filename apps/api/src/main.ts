import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // OpenAPI docs — only in non-production, or set SWAGGER_ENABLED=true to force on
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const docConfig = new DocumentBuilder()
      .setTitle('SYNAPSE API')
      .setDescription(
        'SYNAPSE AI LinkedIn Personal Branding System — REST API.\n\n' +
        '**Authentication:** Cookie-based JWT (`synapse_token`) for browser clients. ' +
        'API key (`Authorization: Bearer sk_live_...`) for developer integrations (BUSINESS plan required).',
      )
      .setVersion('1.0')
      .addCookieAuth('synapse_token')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'API Key' }, 'api-key')
      .addTag('auth', 'LinkedIn OAuth + session')
      .addTag('users', 'Profile & preferences')
      .addTag('onboarding', 'First-run wizard')
      .addTag('trends', 'HN + Google News + LinkedIn trend feed')
      .addTag('content', 'AI post generation')
      .addTag('drafts', 'Draft lifecycle & LinkedIn publishing')
      .addTag('content-bank', 'Manual content library')
      .addTag('brand-memory', 'Brand DNA, Brand Score, Voice Report, Post Analytics')
      .addTag('community', 'Niche leaderboard')
      .addTag('billing', 'Razorpay + Stripe subscriptions')
      .addTag('plans', 'Plan definitions & token usage')
      .addTag('developer', 'API key management (BUSINESS plan)')
      .addTag('organizations', 'Team accounts & invites')
      .addTag('notifications', 'In-app notification inbox')
      .addTag('timing', 'Optimal posting time recommendations')
      .addTag('usage', 'Token consumption analytics')
      .addTag('images', 'Upload & AI image generation')
      .addTag('admin', 'Admin-only platform management')
      .addTag('waitlist', 'Pre-launch signup')
      .build();

    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'SYNAPSE API Docs',
    });
    console.log(`Swagger docs: http://localhost:${parseInt(process.env.API_PORT ?? '3001', 10)}/docs`);
  }

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`SYNAPSE API running on http://localhost:${port}/api`);
}

bootstrap();
