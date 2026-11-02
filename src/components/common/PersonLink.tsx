import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";

/** Links a person's name or avatar to their read-only profile (or to your own profile page when it's you). */
export function PersonLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { user } = useSession();
  return (
    <Link to={id === user.id ? "/profile" : `/people/${id}`} className={cn("rounded-sm hover:underline", className)}>
      {children}
    </Link>
  );
}
