import EntityBase from "src/shared/global/entityBase.entity";
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

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
}
