import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entity/user.entity';
import { Role, RoleName } from '../auth/entity/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
  }

  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password,
      firstName,
      lastName,
    });
    return this.usersRepository.save(user);
  }

  async createUserWithGoogle(
    email: string,
    firstName?: string,
    lastName?: string,
    googleId?: string
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      firstName,
      lastName,
      googleId,
      password: null, // برای Google OAuth نیازی به password نیست
    });
    return this.usersRepository.save(user);
  }

  async updateUser(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async updateUserRoles(userId: string, roleNames: RoleName[]): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.rolesRepository.find({
      where: roleNames.map((name) => ({ name })),
    });

    if (roles.length !== roleNames.length) {
      throw new NotFoundException('One or more roles not found');
    }

    user.roles = roles;
    return this.usersRepository.save(user);
  }

  async getAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async ensureRolesExist(): Promise<void> {
    const roleNames = Object.values(RoleName);
    for (const roleName of roleNames) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: roleName },
      });
      if (!existingRole) {
        const role = this.rolesRepository.create({
          name: roleName,
          description: `${roleName} role`,
        });
        await this.rolesRepository.save(role);
      }
    }
  }
}
