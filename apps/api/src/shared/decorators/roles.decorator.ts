import { SetMetadata } from '@nestjs/common';
import { RoleName } from 'src/app/auth/entity/role.entity';

export const Roles = (...roles: RoleName[]) => SetMetadata('roles', roles);
