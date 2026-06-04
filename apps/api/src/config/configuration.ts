export default () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackUrl: process.env.LINKEDIN_CALLBACK_URL ?? 'http://localhost:3001/auth/linkedin/callback',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiry: process.env.JWT_EXPIRY ?? '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-production',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '30d',
  },

  encryption: {
    key: process.env.AUTH_ENCRYPTION_KEY ?? '0'.repeat(64),
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? 'gemini',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    modelGeneration: process.env.OPENAI_MODEL_GENERATION ?? 'gpt-4o-mini',
    modelCategorization: process.env.OPENAI_MODEL_CATEGORIZATION ?? 'gpt-4o-mini',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM ?? 'SYNAPSE <noreply@synapse.app>',
  },
});
