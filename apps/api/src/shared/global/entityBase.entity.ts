import {
  BaseEntity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export default class EntityBase extends BaseEntity {
  @CreateDateColumn({ type: 'timestamp with time zone', select: false })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', select: false })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', select: false })
  deletedAt?: Date;

  @Column('boolean', { default: true })
  activeStatus?: boolean;
}
