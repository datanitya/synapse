export type OrgRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface OrgMemberUser {
  id: string;
  name: string;
  email: string;
  profilePictureUrl: string | null;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
  user: OrgMemberUser;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  members: OrgMember[];
  invites: OrgInvite[];
}

export interface CreateOrgPayload {
  name: string;
}

export interface InviteMemberPayload {
  email: string;
  role?: OrgRole;
}

export interface InviteResponse {
  inviteToken: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
  inviteId: string;
}
