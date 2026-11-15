import { useTranslation } from "react-i18next";
import { Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { PersonLink } from "@/components/common/PersonLink";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { MAX_SQUAD_SIZE, MIN_RANKED_MEMBERS, type Squad } from "@/api/squadApi";

/** One squad: its members (with pending invites marked) and the actions the viewer is allowed. */
export function SquadCard({
  squad,
  viewerId,
  onAdd,
  onRemove,
  onDisband,
  footer,
}: {
  squad: Squad;
  viewerId: string;
  onAdd?: () => void;
  onRemove?: (userId: string, self: boolean) => void;
  onDisband?: () => void;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const departments = new Set(squad.members.filter((m) => m.status === "active").map((m) => m.user.department.en)).size;
  const needed = Math.max(0, MIN_RANKED_MEMBERS - squad.activeCount);
  const full = squad.members.length >= MAX_SQUAD_SIZE;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            {squad.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("squads.memberSummary", {
              n: formatNumber(squad.activeCount, lang),
              max: formatNumber(MAX_SQUAD_SIZE, lang),
              depts: formatNumber(departments, lang),
            })}
            {" · "}
            {t("squads.createdBy", { name: t2(squad.createdBy.name) })}
          </p>
        </div>
        {squad.ranked ? (
          <Badge variant="success">{t("squads.ranked")}</Badge>
        ) : (
          <Badge variant="muted">{t("squads.needsMore", { n: formatNumber(needed, lang) })}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-md border">
          {squad.members.map((m) => {
            const self = m.user.id === viewerId;
            return (
              <li key={m.user.id} className="flex items-center gap-3 px-3 py-2">
                <PersonLink id={m.user.id} className="shrink-0">
                  <PersonAvatar person={m.user} size="sm" />
                </PersonLink>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <PersonLink id={m.user.id}>{t2(m.user.name)}</PersonLink>
                    {self && (
                      <Badge variant="secondary" className="ms-2 align-middle">
                        {t("common.you")}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{t2(m.user.department)}</p>
                </div>
                {m.status === "invited" && <Badge variant="gold">{t("squads.invited")}</Badge>}
                {onRemove && (squad.canManage || self) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => onRemove(m.user.id, self)}
                    aria-label={self ? t("squads.leave") : t("squads.remove")}
                  >
                    <UserMinus className="h-4 w-4" />
                    <span className="hidden sm:inline">{self ? t("squads.leave") : t("squads.remove")}</span>
                  </Button>
                )}
              </li>
            );
          })}
          {squad.members.length === 0 && <li className="p-3 text-xs text-muted-foreground">{t("squads.noMembers")}</li>}
        </ul>
        <div className="flex flex-wrap gap-2">
          {squad.canManage && onAdd && (
            <Button size="sm" variant="outline" className="gap-2" onClick={onAdd} disabled={full}>
              <UserPlus className="h-4 w-4" />
              {t("squads.addPeople")}
            </Button>
          )}
          {squad.canManage && onDisband && (
            <Button size="sm" variant="ghost" className="gap-2 text-destructive" onClick={onDisband}>
              <Trash2 className="h-4 w-4" />
              {t("squads.disband")}
            </Button>
          )}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
