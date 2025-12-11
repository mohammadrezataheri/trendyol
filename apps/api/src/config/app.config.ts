import { NestApplicationOptions, VersioningType } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * تنظیمات CORS
 */
export const corsConfig = (): CorsOptions => ({
  origin: process.env.CORS_ORIGIN || true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

/**
 * تنظیمات Helmet
 */
export const helmetConfig = () => ({
  /**for icon pwa */
  contentSecurityPolicy: false, // غیرفعال کردن CSP
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
});

/**
 * تنظیمات Compression
 */
export const compressionConfig = () => ({
  level: parseInt(process.env.COMPRESSION_LEVEL || '6', 10),
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
});

/**
 * تنظیمات Body Parser
 */
export const bodyParserConfig = () => ({
  jsonLimit: process.env.JSON_LIMIT || '50mb',
  urlencodedLimit: process.env.URLENCODED_LIMIT || '50mb',
  urlencodedExtended: true,
});

/**
 * تنظیمات Versioning
 */
export const versioningConfig = () => ({
  type: VersioningType.URI as VersioningType.URI,
  defaultVersion: process.env.DEFAULT_VERSION || '1',
});

/**
 * تنظیمات Validation Pipe
 */
export const validationPipeConfig = () => ({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: process.env.FORBID_NON_WHITELISTED === 'true',
});

/**
 * تنظیمات NestJS Application
 */
export const appOptions = (): NestApplicationOptions => ({
  // می‌توانید تنظیمات اضافی اینجا اضافه کنید
  // مثلاً logger options, abortOnError, etc.
});

/**
 * تنظیمات TypeORM
 * استفاده از path pattern برای پیدا کردن خودکار همه entity ها
 * این روش با tsc compiler سازگار است (بدون bundling)
 */
export const typeOrmConfig = (): TypeOrmModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // مسیر entity ها - به صورت خودکار همه entity ها را پیدا می‌کند
  // در development: از src استفاده می‌کند
  // در production: از dist استفاده می‌کند
  const entityPath = isDevelopment
    ? join(__dirname, '../app/**/*.entity.{js,ts}')
    : join(__dirname, '../app/**/*.entity.js');
  return {
    type: 'postgres',
    // url: process.env.PG_URL,
    host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PG_PORT || process.env.DB_PORT || 5432),
    username: process.env.PG_USERNAME || process.env.DB_USERNAME || 'postgres',
    password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database:
      process.env.PG_DATABASE || process.env.DB_NAME || 'trendyol_scrapper',
    synchronize: true,
    cache: {
      type: 'redis',
      ignoreErrors: true,
      options: {
        host:
          isDevelopment && process.env.REDIS_HOST
            ? process.env.REDIS_HOST
            : undefined,
        port:
          isDevelopment && process.env.REDIS_PORT
            ? Number(process.env.REDIS_PORT)
            : undefined,
        url:
          (isProduction || isTest) && process.env.REDIS_URL
            ? process.env.REDIS_URL
            : undefined,
        password:
          (isProduction || isTest) && process.env.REDIS_PASSWORD
            ? process.env.REDIS_PASSWORD
            : undefined,
      },
      tableName: 'typeorm-cache',
    },
    entities: [entityPath],
    // logging: ['error', 'warn'],
    logging: isDevelopment,
  };
};

/**
 * تنظیمات کلی اپلیکیشن
 */
export const config = () => ({
  appOptions: appOptions(),
  cors: corsConfig(),
  helmet: helmetConfig(),
  compression: compressionConfig(),
  bodyParser: bodyParserConfig(),
  versioning: versioningConfig(),
  validationPipe: validationPipeConfig(),
  globalPrefix: process.env.GLOBAL_PREFIX || 'api/v1',
  port: parseInt(process.env.PORT || '3000', 10),
  staticAssets: {
    rootPath: process.env.STATIC_ASSETS_PATH || 'public',
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Trendyol Scrapper API',
    description:
      process.env.SWAGGER_DESCRIPTION ||
      'API documentation for Trendyol Scrapper application',
    version: process.env.SWAGGER_VERSION || '1.0',
    path: process.env.SWAGGER_PATH || 'docs',
    persistAuthorization: true,
    useGlobalPrefix: false,
  },
});
