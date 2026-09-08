/**
 * Saravana Bhavan Platform Roles
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  OWNER: 'owner',
  GUEST: 'guest',
};

export const ROLE_HIERARCHY = {
  super_admin: 100,
  owner: 90,
  manager: 50,
  guest: 10,
};
