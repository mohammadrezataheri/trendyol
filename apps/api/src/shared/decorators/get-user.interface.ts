import { User } from 'src/app/auth/entity/user.entity';

/**
 * Interface برای type safety در استفاده از دکوریتور GetUser
 * این اینترفیس برای type annotation در controller ها استفاده می‌شود
 */
export interface IGetUser extends User {}

/**
 * Type helper برای دریافت یک فیلد خاص از کاربر
 */
export type GetUserField<K extends keyof User> = User[K];
