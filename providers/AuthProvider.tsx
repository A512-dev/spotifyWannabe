"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { mockCredentials } from "@/data/auth-credentials";
import type { AuthCredential } from "@/data/auth-credentials";
import { users as mockedUsers } from "@/data/users";
import { authenticateUser, findUserByEmail, normalizeEmail } from "@/lib/auth";
import type { ApprovalStatus, Gender, User } from "@/types/domain";

const CURRENT_USER_STORAGE_KEY = "soundwave.currentUser";
const USERS_STORAGE_KEY = "soundwave.users";
const CREDENTIALS_STORAGE_KEY = "soundwave.credentials";
const ARTIST_APPLICATIONS_STORAGE_KEY = "soundwave.artistApplications";

interface AuthActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface ListenerRegistrationInput {
  displayName: string;
  email: string;
  password: string;
  birthDate: string;
  gender: Gender;
}

interface ArtistApplicationInput {
  email: string;
  password: string;
  stageName: string;
  portfolioSamples: string;
}

interface UserProfileUpdateInput {
  avatarUrl?: string;
  birthDate?: string;
  displayName?: string;
  gender?: Gender;
}

export interface ArtistApplication {
  id: string;
  email: string;
  stageName: string;
  portfolioSamples: string;
  status: ApprovalStatus;
  submittedAt: string;
}

interface AuthContextValue {
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);

  if (!storedValue) {
    return fallback;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createUsername(displayName: string, email: string) {
  const source = displayName.trim() || email.split("@")[0] || "listener";
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return `${slug || "listener"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUsers, setAuthUsers] = useState<User[]>(mockedUsers);
  const [credentials, setCredentials] = useState<AuthCredential[]>(mockCredentials);
  const [artistApplications, setArtistApplications] = useState<ArtistApplication[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    setAuthUsers(readStoredValue(USERS_STORAGE_KEY, mockedUsers));
    setCredentials(readStoredValue(CREDENTIALS_STORAGE_KEY, mockCredentials));
    setArtistApplications(readStoredValue(ARTIST_APPLICATIONS_STORAGE_KEY, []));
    setCurrentUserState(readStoredValue<User | null>(CURRENT_USER_STORAGE_KEY, null));
    setIsAuthReady(true);
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);

    if (user) {
      writeStoredValue(CURRENT_USER_STORAGE_KEY, user);
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const user = authenticateUser(email, password, authUsers, credentials);

      if (user) {
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
    if (!currentUser) {
      return {
        ok: false,
        error: "No user is currently signed in."
      };
    }

    const normalizedEmail = normalizeEmail(currentUser.email);
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
        ...currentUser,
        ...input,
        lastActiveAt: new Date().toISOString()
      };
      const nextUsers = authUsers.map((user) => (user.id === nextUser.id ? nextUser : user));

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

      if (findUserByEmail(authUsers, normalizedEmail)) {
        return {
          ok: false,
          error: "An account with this email already exists."
        };
      }

      const now = new Date().toISOString();
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
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
