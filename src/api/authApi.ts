import { apiClient, setAccessToken } from "./client";
import type { StaffMember } from "@/data";

interface AuthResponse {
  accessToken: string;
  user: StaffMember;
}

export async function login(email: string, password: string): Promise<StaffMember> {
  const res = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  setAccessToken(res.data.accessToken);
  return res.data.user;
}

/** Silent session restore on app load — resolves to null (not a thrown error) if there's no valid refresh cookie. */
export async function refresh(): Promise<StaffMember | null> {
  try {
    const res = await apiClient.post<AuthResponse>("/auth/refresh");
    setAccessToken(res.data.accessToken);
    return res.data.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function me(): Promise<StaffMember> {
  const res = await apiClient.get<StaffMember>("/auth/me");
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.patch("/auth/password", { currentPassword, newPassword });
}
