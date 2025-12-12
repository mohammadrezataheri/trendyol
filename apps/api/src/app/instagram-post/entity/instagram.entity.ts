import EntityBase from "src/shared/global/entityBase.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, JoinColumn } from "typeorm";
import AuthConfig from "./auth-config.entity";

@Entity()
// @Unique("Instagram_unique", ["username"])
export default class InstagramAccount extends EntityBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  connectedAccountId: string;

  @Column({ type: 'varchar', nullable: true })
  username: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'int', nullable: true })
  authConfigId: number;

  @Column({ type: 'varchar', nullable: true })
  instagramId: string; // ID از Instagram API

  @Column({ type: 'varchar', nullable: true })
  accountType: string; // BUSINESS, PERSONAL, etc.

  @Column({ type: 'text', nullable: true })
  biography: string;

  @Column({ type: 'int', nullable: true })
  followersCount: number;

  @Column({ type: 'int', nullable: true })
  followsCount: number;

  @Column({ type: 'int', nullable: true })
  mediaCount: number;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar', nullable: true })
  status: string; // ACTIVE, INITIALIZING, etc.

  @ManyToOne(() => AuthConfig, (authConfig) => authConfig.instagramAccounts, { nullable: true })
  @JoinColumn({ name: 'authConfigId' })
  authConfig: AuthConfig;
}
