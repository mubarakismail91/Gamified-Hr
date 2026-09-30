import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "gold" | "muted";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-gold/15 text-[hsl(var(--gold))]",
    muted: "bg-muted text-muted-foreground",
  } as const;

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums leading-tight animate-count-up">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
