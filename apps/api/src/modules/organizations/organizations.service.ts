import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrgRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../digest/email.service';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  // ─── Org CRUD ──────────────────────────────────────────────────────────────

  async create(userId: string, name: string) {
    const baseSlug = generateSlug(name);
    // Ensure slug uniqueness by appending a short random suffix if taken
    let slug = baseSlug;
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    return this.prisma.organization.create({
      data: {
        name,
        slug,
        members: { create: { userId, role: OrgRole.OWNER } },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, profilePictureUrl: true } } } } },
    });
  }

  async getMyOrgs(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, profilePictureUrl: true } } },
        },
        invites: { where: { expiresAt: { gt: new Date() } } },
      },
    });
  }

  async getOne(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, profilePictureUrl: true } } },
        },
        invites: { where: { expiresAt: { gt: new Date() } } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    this.requireMember(org.members, userId);
    return org;
  }

  async updateName(orgId: string, userId: string, name: string) {
    await this.requireRole(orgId, userId, [OrgRole.OWNER]);
    return this.prisma.organization.update({ where: { id: orgId }, data: { name } });
  }

  async delete(orgId: string, userId: string) {
    await this.requireRole(orgId, userId, [OrgRole.OWNER]);
    await this.prisma.organization.delete({ where: { id: orgId } });
    return { deleted: true };
  }

  // ─── Member management ────────────────────────────────────────────────────

  async updateMemberRole(orgId: string, actorId: string, targetUserId: string, role: OrgRole) {
    await this.requireRole(orgId, actorId, [OrgRole.OWNER]);
    if (actorId === targetUserId) throw new BadRequestException('Cannot change your own role');

    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.orgMember.update({
      where: { orgId_userId: { orgId, userId: targetUserId } },
      data: { role },
    });
  }

  async removeMember(orgId: string, actorId: string, targetUserId: string) {
    if (actorId !== targetUserId) {
      await this.requireRole(orgId, actorId, [OrgRole.OWNER, OrgRole.EDITOR]);
    }
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === OrgRole.OWNER && actorId !== targetUserId) {
      throw new ForbiddenException('Cannot remove the org owner');
    }
    await this.prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId: targetUserId } } });
    return { removed: true };
  }

  // ─── Invites ──────────────────────────────────────────────────────────────

  async createInvite(orgId: string, actorId: string, email: string, role: OrgRole) {
    await this.requireRole(orgId, actorId, [OrgRole.OWNER, OrgRole.EDITOR]);

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const isMember = await this.prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: existingUser.id } },
      });
      if (isMember) throw new ConflictException('User is already a member');
    }

    // Invalidate any existing pending invite for this email
    await this.prisma.orgInvite.deleteMany({ where: { orgId, email } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite, org, actor] = await Promise.all([
      this.prisma.orgInvite.create({ data: { orgId, email, role, token, expiresAt } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);

    const webUrl = this.config.get<string>('webUrl') ?? 'http://localhost:3000';
    this.email.sendOrgInvite(email, {
      orgName: org?.name ?? 'your team',
      inviterName: actor?.name ?? 'A teammate',
      role,
      inviteToken: token,
      webUrl,
      expiresAt,
    }).catch(() => null); // fire-and-forget

    return { inviteToken: token, email, role, expiresAt, inviteId: invite.id };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.orgInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invite not found or already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email !== invite.email) {
      throw new ForbiddenException('This invite was sent to a different email address');
    }

    const existing = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
    });
    if (existing) throw new ConflictException('Already a member of this organization');

    await this.prisma.$transaction([
      this.prisma.orgMember.create({
        data: { orgId: invite.orgId, userId, role: invite.role },
      }),
      this.prisma.orgInvite.delete({ where: { token } }),
    ]);

    return { joined: true, orgId: invite.orgId };
  }

  async cancelInvite(orgId: string, actorId: string, inviteId: string) {
    await this.requireRole(orgId, actorId, [OrgRole.OWNER, OrgRole.EDITOR]);
    await this.prisma.orgInvite.deleteMany({ where: { id: inviteId, orgId } });
    return { cancelled: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private requireMember(members: Array<{ userId: string }>, userId: string) {
    if (!members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('Not a member of this organization');
    }
  }

  private async requireRole(orgId: string, userId: string, roles: OrgRole[]) {
    const member = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
