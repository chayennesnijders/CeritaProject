/**
 * Who sees which tab in Beheer.
 * - Admins see everything; the owner also sees "Team" (choose moderators).
 * - Moderators only help with the Inbox and with messages from members.
 */
export type StaffRoles = { isAdmin: boolean; isOwner: boolean; isModerator: boolean };

export const MODERATOR_TABS = ["inbox", "berichten"] as const;

export function canSeeAdminTab(tab: string, roles: StaffRoles): boolean {
  if (tab === "team") return roles.isOwner;
  if (roles.isAdmin || roles.isOwner) return true;
  if (roles.isModerator) return (MODERATOR_TABS as readonly string[]).includes(tab);
  return false;
}

/** Moderators only see member messages, never the contact form of organisations and visitors. */
export function seesPublicMessages(roles: StaffRoles): boolean {
  return roles.isAdmin || roles.isOwner;
}
