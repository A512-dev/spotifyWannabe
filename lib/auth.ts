import { mockCredentials } from "@/data/auth-credentials";
import type { AuthCredential } from "@/data/auth-credentials";
import { users } from "@/data/users";
import type { User, UserRole } from "@/types";

// Default landing page after login. Record<UserRole, string> makes TypeScript
// require a destination for every supported role.
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  listener: "/",
  artist: "/artist-dashboard",
  support: "/support",
  admin: "/admin"
};

export function normalizeEmail(email: string) {
  // Email identity is case-insensitive and ignores accidental edge whitespace.
  return email.trim().toLowerCase();
}

/** Finds a profile by normalized email without mutating the supplied array. */
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
  // Phase 1 compares mock plain-text credentials. Production must delegate
  // password verification to a secure server using password hashes.
  const normalizedEmail = normalizeEmail(email);
  const credential = credentials.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (!credential || credential.password !== password) {
    // One failure value covers unknown email and incorrect password.
    return null;
  }

  // A credential row without a matching profile is considered invalid.
  return findUserByEmail(authUsers, normalizedEmail) ?? null;
}

/** Returns the role-appropriate page used after login or access denial. */
export function getPostLoginPath(user: Pick<User, "role">) {
  return ROLE_HOME_PATH[user.role];
}
