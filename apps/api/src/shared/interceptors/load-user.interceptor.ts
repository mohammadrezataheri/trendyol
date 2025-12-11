import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ModuleRef } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/api-controller.decorator';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/app/users/users.service';

/**
 * Interceptor برای بارگذاری اطلاعات کامل کاربر از دیتابیس
 * این interceptor اطلاعات کاربر را از دیتابیس می‌گیرد و در request.user قرار می‌دهد
 */
@Injectable()
export class LoadUserInterceptor implements NestInterceptor {
  constructor(private moduleRef: ModuleRef, private reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // بررسی می‌کنیم که آیا endpoint public است یا نه
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // اگر endpoint public است و کاربر لاگین نکرده، ادامه می‌دهیم
    if (isPublic && !request.user) {
      return next.handle();
    }

    // اگر کاربر لاگین کرده باشد، اطلاعات کامل را از دیتابیس می‌گیریم
    if (request.user && request.user.id) {
      const usersService = this.moduleRef.get(UsersService, { strict: false });
      const fullUser = await usersService.findById(request.user.id);

      if (fullUser) {
        // اطلاعات کامل کاربر را در request.user قرار می‌دهیم
        request.user = fullUser;
      } else if (!isPublic) {
        // اگر کاربر پیدا نشد و endpoint public نیست، خطا می‌دهیم
        throw new Error('User not found in database.');
      }
    }

    return next.handle();
  }
}
