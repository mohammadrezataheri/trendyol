import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ScrapeConfigStatusEnum } from '../../../shared/enums/scrape-config-status.enum';

@Entity()
export default class ScrapeConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ type: 'int', default: 1 })
  maxPages: number;

  @Column({ type: 'int', default: 2000 })
  delay: number; // delay between requests in ms

  @Column({ type: 'int', nullable: true })
  limit: number; // limit number of products to scrape

  @Column({ nullable: true })
  category: string; // category ID from external system

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  markupPercentage: number; // markup percentage on priceInToman

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // whether this config should be processed

  @Column({
    type: 'enum',
    enum: ScrapeConfigStatusEnum,
    default: ScrapeConfigStatusEnum.idle,
  })
  status: ScrapeConfigStatusEnum; // current status of the scrape job

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date; // last time this config was executed

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date; // next scheduled run time

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date; // when the current run started

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date; // when the current run completed

  @Column({ type: 'int', nullable: true })
  lastProductsScraped: number; // number of products scraped in last run

  @Column('text', { nullable: true })
  lastError: string; // last error message if failed

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
