import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TrendyolService } from './trendyol.service';
import { TrendyolController } from './trendyol.controller';
import TrendyolProduct from './entity/trendyol-product.entity';
import CurrencyPrices from './entity/currency.entity';
import ScrapeConfig from './entity/scrape-config.entity';
import { SazitoModule } from '../sazito/sazito.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrendyolProduct, CurrencyPrices, ScrapeConfig]),
    HttpModule,
    ConfigModule,
    SazitoModule,
    AiModule,
  ],
  controllers: [TrendyolController],
  providers: [TrendyolService],
  exports: [TrendyolService],
})
export class TrendyolModule {}
