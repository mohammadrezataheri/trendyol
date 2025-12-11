import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ConflictException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Convert JWT expiresIn format (e.g., '7d', '24h', '30m') to milliseconds
   */
  private getCookieMaxAge(): number {
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '7d');
    
    // Parse expiresIn format (e.g., '7d', '24h', '30m', '3600s')
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days if format is invalid
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: { [key: string]: number } = {
      s: 1000,           // seconds
      m: 60 * 1000,      // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
    };

    return value * (multipliers[unit] || multipliers.d);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<RegisterResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.createUser(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );

    // Auto login after registration
    const loginResult = await this.authService.login(user);
    
    // Set token in HTTP-only cookie
    res.cookie('access_token', loginResult.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getCookieMaxAge(),
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      access_token: loginResult.access_token,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiBody({ type: LoginDto })
  async login(@Request() req, @Res({ passthrough: true }) res: Response, @Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const loginResult = await this.authService.login(req.user);
    
    // Set token in HTTP-only cookie
    res.cookie('access_token', loginResult.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getCookieMaxAge(),
    });

    return loginResult;
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth',
  })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in with Google',
    type: LoginResponseDto,
  })
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    const user = await this.authService.validateGoogleUser(req.user);
    const loginResult = await this.authService.login(user);
    
    // Set token in HTTP-only cookie
    res.cookie('access_token', loginResult.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getCookieMaxAge(),
    });
    
    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/auth/callback?user=${encodeURIComponent(JSON.stringify(loginResult.user))}`);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return {
      message: 'Logged out successfully',
    };
  }
}

