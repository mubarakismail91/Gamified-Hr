import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as userApi from "@/api/userApi";

export const usersQueryKey = (departmentId?: string) => ["users", departmentId ?? "all"] as const;

export function useUsersQuery(departmentId?: string) {
  return useQuery({
    queryKey: usersQueryKey(departmentId),
    queryFn: () => userApi.listUsers(departmentId),
  });
}

/**
 * Any mutation invalidates every users list, not just the current filter —
 * simplest correct option at this data size. Also invalidates departments:
 * deactivating a manager vacates their department (managerId -> null) on
 * the backend, so a stale department list could show a manager who's gone.
 */
function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  };
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: invalidate,
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: userApi.UpdateUserInput }) => userApi.updateUser(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeactivateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: userApi.deactivateUser,
    onSuccess: invalidate,
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: userApi.resetPassword,
  });
}

export function useAwardXpMutation() {
  const invalidate = useInvalidateUsers();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason?: string }) =>
      userApi.awardXp(id, amount, reason),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
