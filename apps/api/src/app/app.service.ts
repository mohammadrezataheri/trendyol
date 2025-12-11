import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users/users.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private usersService: UsersService) {}

  async onModuleInit() {
    // Ensure roles exist when app starts
    await this.usersService.ensureRolesExist();
  }

  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
