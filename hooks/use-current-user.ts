import { useAuth } from "@/providers/AuthProvider";

// Small hook wrapper gives feature teams a stable import if auth internals change.
export function useCurrentUser() {
  return useAuth().currentUser;
}

