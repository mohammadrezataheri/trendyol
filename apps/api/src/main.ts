/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app/app.module';
import { config, swagger } from './config';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

async function bootstrap() {
  console.log('appConfig');
  const appConfig = config();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    appConfig.appOptions
  );

  const log = new Logger('Main');

  app.setGlobalPrefix(appConfig.globalPrefix);

  const httpAdapterHost = app.get(HttpAdapterHost);

  // Helmet Configuration
  app.use(helmet(appConfig.helmet));

  // Compression Configuration
  app.use(compression(appConfig.compression));

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe(appConfig.validationPipe));

  // Cookie Parser Middleware
  app.use(cookieParser());

  // Versioning Configuration
  app.enableVersioning(appConfig.versioning);

  // Static Assets
  app.useStaticAssets(join(__dirname, '..', appConfig.staticAssets.rootPath));

  // Body Parser Configuration
  app.use(json({ limit: appConfig.bodyParser.jsonLimit }));
  app.use(
    urlencoded({
      extended: appConfig.bodyParser.urlencodedExtended,
      limit: appConfig.bodyParser.urlencodedLimit,
    })
  );

  // CORS Configuration
  app.enableCors(appConfig.cors);

  // Swagger Configuration
  swagger(app);

  await app.listen(appConfig.port);
  log.log(
    `🚀 Application is running on: http://localhost:${appConfig.port}/${appConfig.globalPrefix}`
  );
  log.log(
    `📚 Swagger documentation available at: http://localhost:${appConfig.port}/${appConfig.swagger.path}`
  );
}

bootstrap();
