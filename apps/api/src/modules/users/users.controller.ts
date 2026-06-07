import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';

interface AuthUser { id: string }

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() body: { name?: string; headline?: string }) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Patch('credentials')
  updateCredentials(@CurrentUser() user: AuthUser, @Body() dto: UpdateCredentialsDto) {
    return this.usersService.updateCredentials(user.id, dto);
  }
}
