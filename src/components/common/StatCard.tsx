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

  const iconBox = (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
      <Icon className="h-5 w-5" />
    </span>
  );
  const labelText = <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>;
  const hintText = hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>;

  // A long text value (e.g. a department name) goes on its own line under the icon and label, so it
  // gets the card's full width instead of being cut off or broken mid-word.
  if (typeof value === "string" && value.length > 14) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            {iconBox}
            {labelText}
          </div>
          <p className="text-lg font-bold leading-snug">{value}</p>
          {hintText}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        {iconBox}
        <div className="min-w-0 space-y-0.5">
          {labelText}
          <p className="text-2xl font-bold tabular-nums leading-tight animate-count-up">{value}</p>
          {hintText}
        </div>
      </CardContent>
    </Card>
  );
}
