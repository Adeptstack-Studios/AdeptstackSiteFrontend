export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

export const ROLES: Role[] = ['OWNER', 'EDITOR', 'VIEWER'];

/** What each role may do, for the team page, invites and the account page. */
export const ROLE_INFO: Record<Role, { label: string; note: string }> = {
  OWNER: {label: 'Owner', note: 'Everything, including the team and roles.'},
  EDITOR: {label: 'Editor', note: 'Creates and edits apps, releases and posts.'},
  VIEWER: {label: 'Viewer', note: 'Sees everything, including statistics, but changes nothing.'},
};

export interface TeamMember {
  id: number;
  username: string;
  role: Role | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  /** the signed-in user */
  you: boolean;
}

/** An open invite link; token only comes once, right after creating it. */
export interface InviteInfo {
  id: number;
  /** the account name, chosen by the owner */
  username: string;
  role: Role;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string;
  token: string | null;
}

export type ActivityTarget = 'RELEASE' | 'POST' | 'APP' | 'PUSH' | 'USER' | 'INVITE' | 'FILE';

export interface ActivityEntry {
  id: number;
  at: string;
  /** null when the backend did it by itself */
  actor: string | null;
  action: string;
  targetType: ActivityTarget;
  targetId: number | null;
  appId: number | null;
  summary: string;
}

/** The areas the activity log can be narrowed to; Team covers accounts and invites. */
export const ACTIVITY_AREAS: { key: string; label: string; targets: ActivityTarget[] }[] = [
  {key: 'releases', label: 'Releases', targets: ['RELEASE']},
  {key: 'posts', label: 'Blog', targets: ['POST']},
  {key: 'apps', label: 'Store listings', targets: ['APP']},
  {key: 'pushes', label: 'Pushes', targets: ['PUSH']},
  {key: 'files', label: 'Files', targets: ['FILE']},
  {key: 'team', label: 'Team', targets: ['USER', 'INVITE']},
];

/** At least 10 characters; BCrypt on the server ignores everything after 72 bytes and refuses it. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;
