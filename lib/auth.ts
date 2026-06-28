import { mockCredentials } from "@/data/auth-credentials";
import { users } from "@/data/users";
import type { User, UserRole } from "@/types";

// Role-based redirects belong in logic/config, not inside page JSX.
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  listener: "/",
  artist: "/artist-dashboard",
  support: "/support",
  admin: "/admin"
};

export function authenticateUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = mockCredentials.find((item) => item.email === normalizedEmail);

  if (!credential || credential.password !== password) {
    return null;
  }

  return users.find((user) => user.email.toLowerCase() === normalizedEmail) ?? null;
}

export function getPostLoginPath(user: Pick<User, "role">) {
  return ROLE_HOME_PATH[user.role];
}
