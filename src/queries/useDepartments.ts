import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as departmentApi from "@/api/departmentApi";

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: departmentApi.listDepartments,
  });
}

/**
 * Assigning/clearing a department's manager changes that user's `role` on
 * the backend (see syncManagerRoles) — so every department mutation also
 * invalidates the users list, not just departments.
 */
function useInvalidateDepartmentsAndUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateDepartmentMutation() {
  const invalidate = useInvalidateDepartmentsAndUsers();
  return useMutation({
    mutationFn: departmentApi.createDepartment,
    onSuccess: invalidate,
  });
}

export function useUpdateDepartmentMutation() {
  const invalidate = useInvalidateDepartmentsAndUsers();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: departmentApi.UpdateDepartmentInput }) =>
      departmentApi.updateDepartment(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartmentMutation() {
  const invalidate = useInvalidateDepartmentsAndUsers();
  return useMutation({
    mutationFn: departmentApi.deleteDepartment,
    onSuccess: invalidate,
  });
}
