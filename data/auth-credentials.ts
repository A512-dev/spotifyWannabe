export interface AuthCredential {
  email: string;
  password: string;
}

// Mock credentials are separate from User records because passwords are auth data, not profile data.
// A real backend would replace this file with a login endpoint and hashed password storage.
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
