import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SazitoService } from './sazito.service';
import { SazitoController } from './sazito.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // Add entities here if needed
    // TypeOrmModule.forFeature([SazitoEntity]),
  ],
  controllers: [SazitoController],
  providers: [SazitoService],
  exports: [SazitoService],
})
export class SazitoModule {}

