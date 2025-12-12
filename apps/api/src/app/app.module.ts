import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { typeOrmConfig } from 'src/config';
import { SharedModule } from 'src/shared/shared.module';
import { InstagramPostModule } from './instagram-post/instagram-post.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => typeOrmConfig(),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    InstagramPostModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
