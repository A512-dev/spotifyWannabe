/** Minimal credential shape used only by the mock authentication layer. */
export interface AuthCredential {
  email: string;
  password: string;
}

// Credentials are deliberately separate from profile records because passwords
// are authentication data, not public user data. These plain-text examples are
// for local demonstration only; a real backend must store salted password hashes.
export const mockCredentials: AuthCredential[] = [
  {
    email: "maya.listener@example.com",
    password: "password123"
  },
  {
    email: "noah.basic@example.com",
    password: "password123"
  },
  {
    email: "lina.artist@example.com",
    password: "password123"
  },
  {
    email: "samir.support@example.com",
    password: "password123"
  },
  {
    email: "elena.admin@example.com",
    password: "password123"
  }
];
