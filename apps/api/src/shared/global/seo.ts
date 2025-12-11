import { Column } from 'typeorm';
import EntityBase from './entityBase.entity';

export default class SeoEntity extends EntityBase {
  @Column({ default: true })
  index: boolean;

  @Column({ default: true })
  follow: boolean;
}
