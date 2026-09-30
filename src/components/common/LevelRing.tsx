import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

/** Circular progress ring — used for "progress to next rank". */
export function LevelRing({
  pct,
  level,
  size = 96,
  stroke = 8,
  className,
}: {
  pct: number;
  level: number | string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp(pct) / 100) * c;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Level ${level}, ${Math.round(pct)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Lvl</span>
        <span className="text-xl font-bold leading-none">{level}</span>
      </span>
    </div>
  );
}
