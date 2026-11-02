import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import type { StaffMember } from "@/data";

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Pick<StaffMember, "initials" | "avatarTone" | "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t2 } = useLocale();
  const dims = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-lg" }[size];
  return (
    <Avatar className={cn(dims, className)}>
      <AvatarFallback className={cn("font-semibold", person.avatarTone)} title={t2(person.name)}>
        {person.initials}
      </AvatarFallback>
    </Avatar>
  );
}
