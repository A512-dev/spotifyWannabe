"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { mockCredentials } from "@/data/auth-credentials";
import type { AuthCredential } from "@/data/auth-credentials";
import { users as mockedUsers } from "@/data/users";
import { authenticateUser, findUserByEmail, normalizeEmail } from "@/lib/auth";
import type { ApprovalStatus, Gender, User } from "@/types/domain";

// Browser storage is split by concern so updating a profile does not rewrite
// credentials or pending artist applications.
const CURRENT_USER_STORAGE_KEY = "soundwave.currentUser";
const USERS_STORAGE_KEY = "soundwave.users";
const CREDENTIALS_STORAGE_KEY = "soundwave.credentials";
const ARTIST_APPLICATIONS_STORAGE_KEY = "soundwave.artistApplications";

interface AuthActionResult<T> {
  /** Explicit result avoids throwing for expected validation/business failures. */
  ok: boolean;
  data?: T;
  error?: string;
}

interface ListenerRegistrationInput {
  // Only fields accepted by the Phase 1 listener signup form belong here.
  displayName: string;
  email: string;
  password: string;
  birthDate: string;
  gender: Gender;
}

interface ArtistApplicationInput {
  // Artist applications do not create a User until staff approves them.
  email: string;
  password: string;
  stageName: string;
  portfolioSamples: string;
}

interface UserProfileUpdateInput {
  // Every field is optional so one form can submit only editable values.
  avatarUrl?: string;
  birthDate?: string;
  displayName?: string;
  gender?: Gender;
}

export interface ArtistApplication {
  // Local-only application shape; operational seed approvals use a domain type.
  id: string;
  email: string;
  stageName: string;
  portfolioSamples: string;
  status: ApprovalStatus;
  submittedAt: string;
}

interface AuthContextValue {
  // State plus all supported auth/account commands exposed to client pages.
  artistApplications: ArtistApplication[];
  currentUser: User | null;
  deleteCurrentUser: () => AuthActionResult<null>;
  isAuthReady: boolean;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  registerListener: (input: ListenerRegistrationInput) => AuthActionResult<User>;
  requestPasswordReset: (email: string) => AuthActionResult<null>;
  setCurrentUser: (user: User | null) => void;
  submitArtistApplication: (input: ArtistApplicationInput) => AuthActionResult<ArtistApplication>;
  updateCurrentUser: (input: UserProfileUpdateInput) => AuthActionResult<User>;
}

// Undefined enables useAuth to detect components rendered outside AppProviders.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Safely reads one JSON value from localStorage.
 * Server rendering and missing/corrupt values use the caller's deterministic
 * fallback so storage problems cannot crash the application shell.
 */
function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    // `window` is absent during Next.js server rendering.
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);

  if (!storedValue) {
    return fallback;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    // Phase 1 trusts valid JSON shapes but recovers from malformed JSON.
    return fallback;
  }
}

/** Serializes a complete value under one of this provider's storage keys. */
function writeStoredValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Produces collision-resistant-enough IDs for single-browser mock records. */
function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Creates a readable, URL-safe username with a short uniqueness suffix. */
function createUsername(displayName: string, email: string) {
  // Prefer the display name, then the email local-part, then a safe fallback.
  const source = displayName.trim() || email.split("@")[0] || "listener";
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // The suffix prevents two users with the same display name from matching.
  return `${slug || "listener"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Seed arrays are initial render values; the mount effect replaces them with
  // any browser-persisted values once localStorage becomes available.
  const [authUsers, setAuthUsers] = useState<User[]>(mockedUsers);
  const [credentials, setCredentials] = useState<AuthCredential[]>(mockCredentials);
  const [artistApplications, setArtistApplications] = useState<ArtistApplication[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Hydrate all auth-related stores exactly once on the client. isAuthReady keeps
  // route guards from redirecting before the saved session has been restored.
  useEffect(() => {
    setAuthUsers(readStoredValue(USERS_STORAGE_KEY, mockedUsers));
    setCredentials(readStoredValue(CREDENTIALS_STORAGE_KEY, mockCredentials));
    setArtistApplications(readStoredValue(ARTIST_APPLICATIONS_STORAGE_KEY, []));
    setCurrentUserState(readStoredValue<User | null>(CURRENT_USER_STORAGE_KEY, null));
    setIsAuthReady(true);
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    // Keep React state and the durable mock session in sync.
    setCurrentUserState(user);

    if (user) {
      writeStoredValue(CURRENT_USER_STORAGE_KEY, user);
    } else {
      // Logging out removes only the session, not the account or credentials.
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const user = authenticateUser(email, password, authUsers, credentials);

      if (user) {
        // Successful login immediately persists/restores the active session.
        setCurrentUser(user);
      }

      return user;
    },
    [authUsers, credentials, setCurrentUser]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const deleteCurrentUser = useCallback((): AuthActionResult<null> => {
    // Deletion requires a signed-in target; this also protects against stale UI.
    if (!currentUser) {
      return {
        ok: false,
        error: "No user is currently signed in."
      };
    }

    const normalizedEmail = normalizeEmail(currentUser.email);
    // Remove both the public profile and its matching login credential.
    const nextUsers = authUsers.filter((user) => user.id !== currentUser.id);
    const nextCredentials = credentials.filter((credential) => normalizeEmail(credential.email) !== normalizedEmail);

    setAuthUsers(nextUsers);
    setCredentials(nextCredentials);
    writeStoredValue(USERS_STORAGE_KEY, nextUsers);
    writeStoredValue(CREDENTIALS_STORAGE_KEY, nextCredentials);
    setCurrentUser(null);

    return {
      ok: true,
      data: null
    };
  }, [authUsers, credentials, currentUser, setCurrentUser]);

  const updateCurrentUser = useCallback(
    (input: UserProfileUpdateInput): AuthActionResult<User> => {
      if (!currentUser) {
        return {
          ok: false,
          error: "No user is currently signed in."
        };
      }

      const nextUser: User = {
        // Input wins over existing editable fields; activity time is always fresh.
        ...currentUser,
        ...input,
        lastActiveAt: new Date().toISOString()
      };
      const nextUsers = authUsers.map((user) => (user.id === nextUser.id ? nextUser : user));

      // Update the account collection before replacing the active session snapshot.
      setAuthUsers(nextUsers);
      writeStoredValue(USERS_STORAGE_KEY, nextUsers);
      setCurrentUser(nextUser);

      return {
        ok: true,
        data: nextUser
      };
    },
    [authUsers, currentUser, setCurrentUser]
  );

  const registerListener = useCallback(
    (input: ListenerRegistrationInput): AuthActionResult<User> => {
      const normalizedEmail = normalizeEmail(input.email);

      // Email is the unique account identity in this mock system.
      if (findUserByEmail(authUsers, normalizedEmail)) {
        return {
          ok: false,
          error: "An account with this email already exists."
        };
      }

      const now = new Date().toISOString();
      // New listeners always begin on Basic and unverified.
      const user: User = {
        id: createId("user-listener"),
        username: createUsername(input.displayName, normalizedEmail),
        displayName: input.displayName.trim(),
        email: normalizedEmail,
        role: "listener",
        subscriptionTier: "basic",
        birthDate: input.birthDate,
        gender: input.gender,
        createdAt: now,
        lastActiveAt: now,
        isEmailVerified: false
      };
      const nextUsers = [...authUsers, user];
      const nextCredentials = [...credentials, { email: normalizedEmail, password: input.password }];

      // Persist the new account, its credential, and a logged-in session.
      setAuthUsers(nextUsers);
      setCredentials(nextCredentials);
      writeStoredValue(USERS_STORAGE_KEY, nextUsers);
      writeStoredValue(CREDENTIALS_STORAGE_KEY, nextCredentials);
      setCurrentUser(user);

      return {
        ok: true,
        data: user
      };
    },
    [authUsers, credentials, setCurrentUser]
  );

  const submitArtistApplication = useCallback(
    (input: ArtistApplicationInput): AuthActionResult<ArtistApplication> => {
      const normalizedEmail = normalizeEmail(input.email);

      // Existing account emails cannot enter the separate application pipeline.
      if (findUserByEmail(authUsers, normalizedEmail)) {
        return {
          ok: false,
          error: "This email already belongs to an existing account."
        };
      }

      const application: ArtistApplication = {
        id: createId("artist-application"),
        email: normalizedEmail,
        stageName: input.stageName.trim(),
        portfolioSamples: input.portfolioSamples.trim(),
        status: "pending",
        submittedAt: new Date().toISOString()
      };
      const nextApplications = [...artistApplications, application];

      // Submission does not log the applicant in or create a user record.
      setArtistApplications(nextApplications);
      writeStoredValue(ARTIST_APPLICATIONS_STORAGE_KEY, nextApplications);

      return {
        ok: true,
        data: application
      };
    },
    [artistApplications, authUsers]
  );

  const requestPasswordReset = useCallback((email: string): AuthActionResult<null> => {
    // Phase 1 only validates presence. Its generic success response avoids
    // revealing whether an email belongs to an account.
    if (!normalizeEmail(email)) {
      return {
        ok: false,
        error: "Email is required."
      };
    }

    return {
      ok: true,
      data: null
    };
  }, []);

  const value = useMemo(
    // Memoization keeps the context reference stable until state/action changes.
    () => ({
      artistApplications,
      currentUser,
      deleteCurrentUser,
      isAuthReady,
      login,
      logout,
      registerListener,
      requestPasswordReset,
      setCurrentUser,
      submitArtistApplication,
      updateCurrentUser
    }),
    [
      artistApplications,
      currentUser,
      deleteCurrentUser,
      isAuthReady,
      login,
      logout,
      registerListener,
      requestPasswordReset,
      setCurrentUser,
      submitArtistApplication,
      updateCurrentUser
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    // Enforce the provider boundary with an immediately actionable error.
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
