import { apiClient } from "./client";
import type { Role, StaffMember } from "@/data";

export interface CreateUserInput {
  nameEn: string;
  nameAr?: string;
  email: string;
  titleEn?: string;
  departmentId: string | null;
  role: Role;
  gender?: "male" | "female";
  startingXp?: number;
}

export interface UpdateUserInput {
  nameEn?: string;
  nameAr?: string;
  email?: string;
  titleEn?: string;
  departmentId?: string | null;
  role?: Role;
  gender?: "male" | "female";
  isActive?: boolean;
}

export interface CreateUserResult {
  user: StaffMember;
  /** Shown once — the backend never returns this again after this response. */
  temporaryPassword: string;
}

export interface ResetPasswordResult {
  user: StaffMember;
  /** Shown once — the backend never returns this again after this response. */
  temporaryPassword: string;
}

export async function listUsers(departmentId?: string): Promise<StaffMember[]> {
  const res = await apiClient.get<StaffMember[]>("/users", { params: departmentId ? { departmentId } : undefined });
  return res.data;
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const res = await apiClient.post<CreateUserResult>("/users", input);
  return res.data;
}

export async function updateUser(id: string, patch: UpdateUserInput): Promise<StaffMember> {
  const res = await apiClient.patch<StaffMember>(`/users/${id}`, patch);
  return res.data;
}

/** Soft delete — the backend sets isActive: false rather than removing the row. */
export async function deactivateUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

export async function awardXp(id: string, amount: number, reason?: string): Promise<StaffMember> {
  const res = await apiClient.post<StaffMember>(`/users/${id}/award-xp`, { amount, reason });
  return res.data;
}

/** There's no way to recover an existing password — it's never stored in plaintext. This issues a new one and forces a change on next login. */
export async function resetPassword(id: string): Promise<ResetPasswordResult> {
  const res = await apiClient.post<ResetPasswordResult>(`/users/${id}/reset-password`);
  return res.data;
}
