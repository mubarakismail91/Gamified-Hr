import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle, Lock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { SKILLS, skillById, type SkillNode } from "@/data";

const BRANCHES: { key: SkillNode["branch"]; labelKey: string }[] = [
  { key: "teaching", labelKey: "skills.branchTeaching" },
  { key: "research", labelKey: "skills.branchResearch" },
  { key: "leadership", labelKey: "skills.branchLeadership" },
  { key: "digital", labelKey: "skills.branchDigital" },
];

const STATE_STYLE = {
  unlocked: "border-primary/40 bg-primary/[0.06]",
  "in-progress": "border-gold/50 bg-gold/[0.08]",
  locked: "border-dashed bg-muted/40 opacity-70",
} as const;

export default function SkillTree() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const [active, setActive] = useState<SkillNode | null>(null);
  const rows = [0, 1, 2];

  return (
    <div className="space-y-6">
      <PageHeader title={t("skills.title")} subtitle={t("skills.subtitle")} />

      <div className="flex flex-wrap gap-4 text-xs">
        <Legend className="bg-primary" label={t("skills.unlocked")} />
        <Legend className="bg-[hsl(var(--gold))]" label={t("skills.inProgress")} />
        <Legend className="bg-muted-foreground/40" label={t("skills.locked")} />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          {/* Branch headers */}
          <div className="grid grid-cols-4 gap-x-6">
            {BRANCHES.map((b) => (
              <h2 key={b.key} className="pb-2 text-center text-sm font-semibold text-muted-foreground">
                {t(b.labelKey)}
              </h2>
            ))}
          </div>

          {/* Grid of nodes, row by row */}
          <div className="grid grid-cols-4 gap-x-6 gap-y-14">
            {rows.map((row) =>
              BRANCHES.map((b) => {
                const node = SKILLS.find((s) => s.branch === b.key && s.row === row);
                if (!node) return <div key={`${b.key}-${row}`} />;
                return (
                  <div key={node.id} className="relative">
                    {node.requires?.length ? (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -top-14 start-1/2 h-14 w-0.5 -translate-x-1/2",
                          node.state === "locked" ? "bg-border" : "bg-primary/40",
                        )}
                      />
                    ) : null}
                    <button onClick={() => setActive(node)} className="w-full text-start">
                      <Card className={cn("min-h-[124px] transition-shadow hover:shadow-elevated", STATE_STYLE[node.state])}>
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center justify-between">
                            <StateDot state={node.state} />
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {t("skills.levelOf", { current: node.level, max: node.maxLevel })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold leading-tight">{t2(node.name)}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{t2(node.description)}</p>
                        </CardContent>
                      </Card>
                    </button>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <div className="mb-1 flex items-center gap-2">
                  <StateDot state={active.state} />
                  <DialogTitle>{t2(active.name)}</DialogTitle>
                </div>
                <DialogDescription>{t2(active.description)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
                  <span className="text-muted-foreground">{t("skills.levelOf", { current: active.level, max: active.maxLevel })}</span>
                  <Badge
                    variant={
                      active.state === "unlocked" ? "success" : active.state === "in-progress" ? "gold" : "muted"
                    }
                  >
                    {t(
                      active.state === "unlocked"
                        ? "skills.unlocked"
                        : active.state === "in-progress"
                          ? "skills.inProgress"
                          : "skills.locked",
                    )}
                  </Badge>
                </div>
                {active.requires?.map((rid) => {
                  const req = skillById(rid);
                  return req ? (
                    <p key={rid} className="text-xs text-muted-foreground">
                      {t("skills.prerequisite", { name: t2(req.name) })}
                    </p>
                  ) : null;
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StateDot({ state }: { state: SkillNode["state"] }) {
  if (state === "unlocked")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (state === "in-progress")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-gold-foreground">
        <Circle className="h-3 w-3 fill-current" />
      </span>
    );
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Lock className="h-3 w-3" />
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
