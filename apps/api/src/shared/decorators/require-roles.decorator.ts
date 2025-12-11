import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { RoleName } from 'src/app/auth/entity/role.entity';
import { RolesGuard } from 'src/app/auth/guards/roles.guard';

/**
 * Decorator ترکیبی که هم RolesGuard و هم Roles را اعمال می‌کند
 * @param roles - نقش‌های مورد نیاز
 * @example
 * @RequireRoles(RoleName.ADMIN)
 * @RequireRoles(RoleName.ADMIN, RoleName.SUPPLIER)
 */
export const RequireRoles = (...roles: RoleName[]) => {
  return applyDecorators(UseGuards(RolesGuard), Roles(...roles));
};
