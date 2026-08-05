import { apiRequest, clearStoredToken, storeToken } from "@/lib/api";
import type { Gender, PublicUser, User } from "@/types/domain";

export interface AuthResponse {
  token: string;
  user: User;
  artistApplicationId?: string;
  applicationStatus?: "pending" | "approved" | "rejected";
}

export interface PreferenceResponse {
  language: "en" | "fa";
  systemSoundEnabled: boolean;
  notificationsEnabled: boolean;
  subscriptionNotifications: boolean;
  followedArtistNotifications: boolean;
  supportNotifications: boolean;
}

export const accountApi = {
  async login(email: string, password: string) {
    const response = await apiRequest<AuthResponse>("/accounts/login/", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }, { auth: false });
    storeToken(response.token);
    return response.user;
  },

  async logout() {
    try {
      await apiRequest<void>("/accounts/logout/", { method: "POST" });
    } finally {
      clearStoredToken();
    }
  },

  me() {
    return apiRequest<User>("/accounts/me/");
  },

  getUser(id: string) {
    return apiRequest<PublicUser>(`/accounts/users/${id}/`);
  },

  async registerListener(input: {
    displayName: string;
    email: string;
    password: string;
    birthDate: string;
    gender: Gender;
    acceptsPrivacyPolicy: boolean;
  }) {
    const response = await apiRequest<AuthResponse>("/accounts/register/listener/", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        passwordConfirmation: input.password
      })
    }, { auth: false });
    storeToken(response.token);
    return response.user;
  },

  async registerArtist(input: {
    email: string;
    password: string;
    stageName: string;
    portfolioDescription?: string;
    sampleLinks?: string[];
    sampleFiles?: File[];
    acceptsPrivacyPolicy: boolean;
  }) {
    const form = new FormData();
    form.append("email", input.email);
    form.append("password", input.password);
    form.append("passwordConfirmation", input.password);
    form.append("stageName", input.stageName);
    form.append("portfolioDescription", input.portfolioDescription ?? "");
    form.append("acceptsPrivacyPolicy", String(input.acceptsPrivacyPolicy));
    input.sampleLinks?.forEach((link) => form.append("sampleLinks", link));
    input.sampleFiles?.forEach((file) => form.append("sampleFiles", file));
    const response = await apiRequest<AuthResponse>("/accounts/register/artist/", {
      method: "POST",
      body: form
    }, { auth: false });
    storeToken(response.token);
    return response;
  },

  requestPasswordReset(email: string) {
    return apiRequest<{ message: string }>("/accounts/password-reset/", {
      method: "POST",
      body: JSON.stringify({ email })
    }, { auth: false });
  },

  updateProfile(input: {
    displayName?: string;
    birthDate?: string;
    gender?: Gender;
    avatarFile?: File | null;
  }) {
    const form = new FormData();
    if (input.displayName !== undefined) form.append("displayName", input.displayName);
    if (input.birthDate !== undefined) form.append("birthDate", input.birthDate);
    if (input.gender !== undefined) form.append("gender", input.gender);
    if (input.avatarFile) form.append("avatarFile", input.avatarFile);
    return apiRequest<User>("/accounts/me/", { method: "PATCH", body: form });
  },

  deleteAccount() {
    return apiRequest<void>("/accounts/me/", { method: "DELETE" });
  },

  getPreferences() {
    return apiRequest<PreferenceResponse>("/accounts/preferences/");
  },

  updatePreferences(input: Partial<PreferenceResponse>) {
    return apiRequest<PreferenceResponse>("/accounts/preferences/", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  followUser(userId: string) {
    return apiRequest<{ isFollowing: boolean; followerCount: number }>(`/accounts/users/${userId}/follow/`, { method: "POST" });
  },

  unfollowUser(userId: string) {
    return apiRequest<{ isFollowing: boolean; followerCount: number }>(`/accounts/users/${userId}/follow/`, { method: "DELETE" });
  }
};
