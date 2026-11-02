import { apiClient } from "./client";
import type { Department } from "@/data";

export interface CreateDepartmentInput {
  nameEn: string;
  nameAr?: string;
  managerId: string | null;
}

export interface UpdateDepartmentInput {
  nameEn?: string;
  nameAr?: string;
  managerId?: string | null;
}

export async function listDepartments(): Promise<Department[]> {
  const res = await apiClient.get<Department[]>("/departments");
  return res.data;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const res = await apiClient.post<Department>("/departments", input);
  return res.data;
}

export async function updateDepartment(id: string, patch: UpdateDepartmentInput): Promise<Department> {
  const res = await apiClient.patch<Department>(`/departments/${id}`, patch);
  return res.data;
}

/** Throws (via axios) with the backend's message if the department still has staff assigned. */
export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/departments/${id}`);
}
