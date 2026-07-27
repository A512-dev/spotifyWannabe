import { useAuth } from "@/providers/AuthProvider";

// Stable feature-facing hook: callers need not know which provider or auth
// implementation supplies the current account.
export function useCurrentUser() {
  return useAuth().currentUser;
}
