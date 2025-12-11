import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['productId', 'url'], { unique: true })
@Index(['productId'], { unique: true })
export default class TrendyolProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  productId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  originalPrice: number;

  @Column('int', { nullable: true })
  priceInToman: number;

  @Column('int', { nullable: true })
  tokensUsed: number; // Total OpenAI tokens used for this product

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discountPercentage: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  imageUrls: string[];

  @Column()
  url: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  category: string;

  @Column('jsonb', { nullable: true })
  additionalData: Record<string, any>;

  @Column('jsonb', { nullable: true })
  variants: Array<{
    sku?: string;
    itemNumber?: number;
    color?: string;
    size?: string[];
    sizeValue?: string;
    price?: number;
    originalPrice?: number;
    priceInToman?: number;
    inStock?: boolean;
    barcode?: string;
    image?: string;
  }>;

  @Column('jsonb', { nullable: true })
  attributes: Array<{
    type: string;
    name: string;
    attribute_type: string;
  }>;

  @Column({ default: false })
  isScraped: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastScrapedAt: Date;

  @Column({ nullable: true })
  sazitoId: number; // ID محصول در سیستم سازیتو

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
