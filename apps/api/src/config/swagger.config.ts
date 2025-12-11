import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from './app.config';

/**
 * تنظیمات و راه‌اندازی Swagger
 */
export const swagger = (app: NestExpressApplication) => {
  const appConfig = config();
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appConfig.swagger.title)
    .setDescription(appConfig.swagger.description)
    .setVersion(appConfig.swagger.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(appConfig.swagger.path, app, document, {
    swaggerOptions: {
      persistAuthorization: appConfig.swagger.persistAuthorization,
    },
    useGlobalPrefix: appConfig.swagger.useGlobalPrefix,
  });
};
