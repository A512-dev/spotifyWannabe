import { ROUTE_ACCESS_RULES } from "@/config/access";
import type { User, UserRole } from "@/types/domain";

// Role checks stay small and explicit so they are easy to reuse in routes, menus, and actions.
export function hasRole(user: User | undefined, roles: UserRole[]) {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}

export function canAccessRoute(user: User | undefined, path: string) {
  const rule = ROUTE_ACCESS_RULES.find((item) => path.startsWith(item.path));

  // Pages without a rule are public inside the app shell for Phase 1.
  if (!rule) {
    return true;
  }

  return hasRole(user, rule.allowedRoles);
}

export function filterNavigationForUser<T extends { allowedRoles: UserRole[] }>(
  items: T[],
  user: User | undefined
) {
  return items.filter((item) => hasRole(user, item.allowedRoles));
}

