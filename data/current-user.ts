import { users } from "@/data/users";

// Legacy convenience export for code that needs a deterministic seed user.
// Interactive screens now use AuthProvider, which begins signed out and persists
// the chosen account in browser storage.
export const currentUser = users[0];
