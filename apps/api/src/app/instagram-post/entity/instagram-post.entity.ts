import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import InstagramAccount from './instagram.entity';
import EntityBase from 'src/shared/global/entityBase.entity';

@Entity()
// @Unique("InstagramPost_unique", ["account"])
export default class InstagramPostConfig extends EntityBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @ManyToOne(() => InstagramAccount, { nullable: false })
  account: number;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  cronTime: string;

  @Column('text', { nullable: true })
  mainPrompt: string;

  @Column('text', { nullable: true })
  captionPrompt: string;

  @Column('jsonb', { nullable: true })
  imageGenerationImage: Array<{
    id: string;
    prompt: string;
  }>;
}
