"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { accountApi } from "@/features/account/api";
import { ApiError, clearStoredToken, getStoredToken } from "@/lib/api";
import type { Gender, User } from "@/types/domain";

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
  acceptsPrivacyPolicy?: boolean;
}

interface ArtistApplicationInput {
  email: string;
  password: string;
  stageName: string;
  portfolioDescription?: string;
  sampleLinks?: string[];
  sampleFiles?: File[];
  acceptsPrivacyPolicy?: boolean;
}

interface UserProfileUpdateInput {
  avatarFile?: File | null;
  birthDate?: string;
  displayName?: string;
  gender?: Gender;
}

interface PasswordResetConfirmInput {
  uid: string;
  token: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

interface AuthContextValue {
  confirmPasswordReset: (input: PasswordResetConfirmInput) => Promise<AuthActionResult<null>>;
  currentUser: User | null;
  deleteCurrentUser: () => Promise<AuthActionResult<null>>;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult<User>>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
  registerListener: (input: ListenerRegistrationInput) => Promise<AuthActionResult<User>>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult<null>>;
  setCurrentUser: (user: User | null) => void;
  submitArtistApplication: (input: ArtistApplicationInput) => Promise<AuthActionResult<{ stageName: string; status: string }>>;
  updateCurrentUser: (input: UserProfileUpdateInput) => Promise<AuthActionResult<User>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshCurrentUser = useCallback(async () => {
    if (!getStoredToken()) {
      setCurrentUser(null);
      return null;
    }
    try {
      const user = await accountApi.me();
      setCurrentUser(user);
      return user;
    } catch {
      clearStoredToken();
      setCurrentUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser().finally(() => setIsAuthReady(true));
  }, [refreshCurrentUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthActionResult<User>> => {
    try {
      const user = await accountApi.login(email, password);
      setCurrentUser(user);
      return { ok: true, data: user };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await accountApi.logout();
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const registerListener = useCallback(async (input: ListenerRegistrationInput): Promise<AuthActionResult<User>> => {
    try {
      const user = await accountApi.registerListener({
        ...input,
        acceptsPrivacyPolicy: input.acceptsPrivacyPolicy ?? true
      });
      setCurrentUser(user);
      return { ok: true, data: user };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const submitArtistApplication = useCallback(async (input: ArtistApplicationInput) => {
    try {
      const response = await accountApi.registerArtist({
        ...input,
        acceptsPrivacyPolicy: input.acceptsPrivacyPolicy ?? true
      });
      setCurrentUser(response.user);
      return {
        ok: true,
        data: { stageName: input.stageName, status: response.applicationStatus ?? "pending" }
      };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthActionResult<null>> => {
    try {
      await accountApi.requestPasswordReset(email);
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const confirmPasswordReset = useCallback(
    async (input: PasswordResetConfirmInput): Promise<AuthActionResult<null>> => {
      try {
        await accountApi.confirmPasswordReset(input);
        return { ok: true, data: null };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    []
  );

  const updateCurrentUser = useCallback(async (input: UserProfileUpdateInput): Promise<AuthActionResult<User>> => {
    try {
      const user = await accountApi.updateProfile(input);
      setCurrentUser(user);
      return { ok: true, data: user };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const deleteCurrentUser = useCallback(async (): Promise<AuthActionResult<null>> => {
    try {
      await accountApi.deleteAccount();
      clearStoredToken();
      setCurrentUser(null);
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    confirmPasswordReset,
    currentUser,
    deleteCurrentUser,
    isAuthReady,
    login,
    logout,
    refreshCurrentUser,
    registerListener,
    requestPasswordReset,
    setCurrentUser,
    submitArtistApplication,
    updateCurrentUser
  }), [
    confirmPasswordReset,
    currentUser,
    deleteCurrentUser,
    isAuthReady,
    login,
    logout,
    refreshCurrentUser,
    registerListener,
    requestPasswordReset,
    submitArtistApplication,
    updateCurrentUser
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
