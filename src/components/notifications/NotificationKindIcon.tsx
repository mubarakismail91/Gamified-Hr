import { Award, Bell, MessageSquareHeart, Sparkles, Swords, TrendingUp } from "lucide-react";
import type { NotificationKind } from "@/data";

export function NotificationKindIcon({ kind, className }: { kind: NotificationKind; className?: string }) {
  const Icon =
    kind === "xp"
      ? TrendingUp
      : kind === "badge"
        ? Award
        : kind === "social"
          ? MessageSquareHeart
          : kind === "quest"
            ? Swords
            : kind === "system"
              ? Bell
              : Sparkles;
  return <Icon className={className} aria-hidden />;
}
