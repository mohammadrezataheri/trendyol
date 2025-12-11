import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('currency_prices')
export default class CurrencyPrices {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string; // e.g., 'TRY', 'USD', etc.

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number; // Exchange rate

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}

