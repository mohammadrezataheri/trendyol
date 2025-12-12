import EntityBase from 'src/shared/global/entityBase.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import InstagramAccount from './instagram.entity';

@Entity()
export default class AuthConfig extends EntityBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  authConfigId: string; // ID returned from Composio

  @Column({ type: 'varchar' })
  toolkit: string; // e.g., "instagram"

  @Column({ type: 'varchar' })
  authScheme: string; // e.g., "oauth2"

  @Column({ type: 'varchar', nullable: true })
  clientId: string;

  @Column({ type: 'text', nullable: true })
  clientSecret: string;

  @Column({ type: 'jsonb', nullable: true })
  scopes: string[];

  @Column({ type: 'varchar', nullable: true })
  redirectUrl: string;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string; // user ID who created this config

  @OneToMany(() => InstagramAccount, (account) => account.authConfig)
  instagramAccounts: InstagramAccount[];
}
