"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { currentUser as mockedCurrentUser } from "@/data/current-user";
import type { User } from "@/types/domain";

interface AuthContextValue {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Phase 1 uses mock auth state. Later this can hydrate from a session endpoint.
  const [currentUser, setCurrentUser] = useState<User>(mockedCurrentUser);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser
    }),
    [currentUser]
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

