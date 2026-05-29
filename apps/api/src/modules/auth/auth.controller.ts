import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  headline?: string;
  profilePictureUrl?: string;
  onboardingComplete: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  linkedinLogin() {
    // Passport redirects to LinkedIn
  }

  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as AuthUser;
    const token = this.authService.signJwt({
      id: user.id,
      email: user.email,
      onboardingComplete: user.onboardingComplete,
    });

    res.cookie('synapse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const webUrl = this.config.get<string>('webUrl') ?? 'http://localhost:3000';
    return res.redirect(`${webUrl}/callback`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      headline: user.headline,
      profilePictureUrl: user.profilePictureUrl,
      onboardingComplete: user.onboardingComplete,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('synapse_token', '', { httpOnly: true, maxAge: 0, path: '/' });
    return { message: 'Logged out' };
  }
}
