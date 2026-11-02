import { useQuery } from "@tanstack/react-query";
import * as auditApi from "@/api/auditApi";

export function useAuditQuery(limit?: number) {
  return useQuery({
    queryKey: ["audit", limit ?? "default"] as const,
    queryFn: () => auditApi.listAuditEntries(limit),
  });
}
