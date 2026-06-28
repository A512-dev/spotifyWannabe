import { mockCredentials } from "@/data/auth-credentials";
import type { AuthCredential } from "@/data/auth-credentials";
import { users } from "@/data/users";
import type { User, UserRole } from "@/types";

// Role-based redirects belong in logic/config, not inside page JSX.
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  listener: "/",
  artist: "/artist-dashboard",
  support: "/support",
  admin: "/admin"
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function findUserByEmail(authUsers: User[], email: string): User | undefined {
  const normalizedEmail = normalizeEmail(email);

  return authUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
}

export function authenticateUser(
  email: string,
  password: string,
  authUsers: User[] = users,
  credentials: AuthCredential[] = mockCredentials
): User | null {
  const normalizedEmail = normalizeEmail(email);
  const credential = credentials.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (!credential || credential.password !== password) {
    return null;
  }

  return findUserByEmail(authUsers, normalizedEmail) ?? null;
}

export function getPostLoginPath(user: Pick<User, "role">) {
  return ROLE_HOME_PATH[user.role];
}
