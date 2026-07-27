import { ROUTE_ACCESS_RULES } from "@/config/access";
import type { User, UserRole } from "@/types/domain";

// These helpers are pure and React-independent, so routes, menus, and actions
// can all apply exactly the same authorization decisions.
export function hasRole(user: User | null | undefined, roles: UserRole[]) {
  // Signed-out and not-yet-loaded users never satisfy a role requirement.
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}

export function canAccessRoute(user: User | null | undefined, path: string) {
  // Prefix matching also protects any nested pages below a configured route.
  const rule = ROUTE_ACCESS_RULES.find((item) => path.startsWith(item.path));

  // "Public" means no role restriction; MainAppLayout still requires login.
  if (!rule) {
    return true;
  }

  return hasRole(user, rule.allowedRoles);
}

export function filterNavigationForUser<T extends { allowedRoles: UserRole[] }>(
  items: T[],
  user: User | null | undefined
) {
  // Preserve each item's full generic type while removing unauthorized entries.
  return items.filter((item) => hasRole(user, item.allowedRoles));
}
