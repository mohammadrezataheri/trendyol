import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from './entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('validateUser', email, password);
    const user = await this.usersService.findByEmail(email);
    console.log('user', user);
    if (user && (await user.validatePassword(password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      roles: user.roles.map((role) => role.name),
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((role) => role.name),
      },
    };
  }

  async validateUserById(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  async validateGoogleUser(profile: any): Promise<User> {
    const { email, firstName, lastName, googleId } = profile;
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // ایجاد کاربر جدید اگر وجود نداشت
      user = await this.usersService.createUserWithGoogle(
        email,
        firstName,
        lastName,
        googleId
      );
    } else if (!user.googleId) {
      // اگر کاربر وجود داشت اما googleId نداشت، آن را اضافه می‌کنیم
      user.googleId = googleId;
      await this.usersService.updateUser(user);
    }

    return user;
  }
}
