import { apiClient } from "./client";
import type { Generation, Role, StaffMember, StaffType } from "@/data";

export interface CreateUserInput {
  nameEn: string;
  nameAr?: string;
  email: string;
  titleEn?: string;
  departmentId: string | null;
  role: Role;
  gender?: "male" | "female";
  generation?: Generation | null;
  staffType?: StaffType | null;
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
  generation?: Generation | null;
  staffType?: StaffType | null;
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

/** idempotencyKey: one per award attempt, so a double-click or a network retry can't award twice. */
export async function awardXp(id: string, amount: number, reason?: string, idempotencyKey?: string): Promise<StaffMember> {
  const res = await apiClient.post<StaffMember>(
    `/users/${id}/award-xp`,
    { amount, reason },
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined,
  );
  return res.data;
}

/** There's no way to recover an existing password — it's never stored in plaintext. This issues a new one and forces a change on next login. */
export async function resetPassword(id: string): Promise<ResetPasswordResult> {
  const res = await apiClient.post<ResetPasswordResult>(`/users/${id}/reset-password`);
  return res.data;
}
