import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';

interface AuthUser { id: string }

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { name: string }) {
    return this.orgsService.create(user.id, body.name);
  }

  @Get()
  getMyOrgs(@CurrentUser() user: AuthUser) {
    return this.orgsService.getMyOrgs(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgsService.getOne(id, user.id);
  }

  @Patch(':id')
  updateName(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.orgsService.updateName(id, user.id, body.name);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgsService.delete(id, user.id);
  }

  @Patch(':id/members/:memberId/role')
  updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: OrgRole },
  ) {
    return this.orgsService.updateMemberRole(id, user.id, memberId, body.role);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.orgsService.removeMember(id, user.id, memberId);
  }

  @Post(':id/invites')
  createInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { email: string; role?: OrgRole },
  ) {
    return this.orgsService.createInvite(id, user.id, body.email, body.role ?? OrgRole.EDITOR);
  }

  @Post('invites/:token/accept')
  acceptInvite(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.orgsService.acceptInvite(token, user.id);
  }

  @Delete(':id/invites/:inviteId')
  cancelInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.orgsService.cancelInvite(id, user.id, inviteId);
  }
}
