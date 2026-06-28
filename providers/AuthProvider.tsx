"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { currentUser as mockedCurrentUser } from "@/data/current-user";
import { authenticateUser } from "@/lib/auth";
import type { User } from "@/types/domain";

interface AuthContextValue {
  currentUser: User;
  login: (email: string, password: string) => User | null;
  setCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Phase 1 uses mock auth state. Later this can hydrate from a session endpoint.
  const [currentUser, setCurrentUser] = useState<User>(mockedCurrentUser);
  const login = useCallback((email: string, password: string) => {
    const user = authenticateUser(email, password);

    if (user) {
      setCurrentUser(user);
    }

    return user;
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      login,
      setCurrentUser
    }),
    [currentUser, login]
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
