import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable trust proxy for secure cookies behind Railway's proxy
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Enable security headers
  app.use(helmet());

  // Enable cookie parsing
  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === 'production';

  // Debug middleware to log cookies - DISABLE IN PRODUCTION
  if (!isProd) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      const userAgent = req.headers['user-agent'];
      logger.debug(
        `[Request] Method: ${req.method}, URL: ${req.url}, Origin: ${origin || 'N/A'}, User-Agent: ${userAgent || 'N/A'}`,
      );

      if (req.cookies && Object.keys(req.cookies).length > 0) {
        logger.debug(`[Cookies] Found: ${Object.keys(req.cookies).join(', ')}`);
      } else {
        logger.debug('[Cookies] No cookies found in request.');
      }
      next();
    });
  }

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Register global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Register global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : isProd
      ? [] // Force configuration in production
      : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
      ];

  if (isProd && allowedOrigins.length === 0) {
    logger.warn(
      'PRODUCTION WARNING: CORS_ORIGINS is not configured. All cross-origin requests will fail.',
    );
  } else {
    logger.log(`Configured CORS origins: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow all for convenience if needed, but better to use allowedOrigins
      if (!isProd || !origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Cookie',
    exposedHeaders: ['Set-Cookie'],
  });

  const port = process.env.PORT || 3000;

  // ALWAYS listen on the port, binding to 0.0.0.0
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://0.0.0.0:${port}`);

  return app;
}

// Direct execution (Standard Node.js entry point)
if (require.main === module) {
  validateEnv();
  bootstrap().catch(err => {
    console.error('Bootstrap Error:', err);
    process.exit(1);
  });
}

// Export for serverless environments (if needed)
export default bootstrap;
