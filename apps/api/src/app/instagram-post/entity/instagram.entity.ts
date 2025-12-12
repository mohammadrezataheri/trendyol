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

  @ManyToOne(() => AuthConfig, (authConfig) => authConfig.instagramAccounts, { nullable: true })
  @JoinColumn({ name: 'authConfigId' })
  authConfig: AuthConfig;
}
