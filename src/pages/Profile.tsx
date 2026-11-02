import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AtSign, Award, IdCard, MapPin, Medal, Network, Sparkles, Swords } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DateStamp } from "@/components/common/DateStamp";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import { StatCard } from "@/components/common/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useSession } from "@/context/SessionContext";
import { useDemoData } from "@/store/DemoDataContext";
import { useMyActivity } from "@/store/hooks";
import { completedQuestCount } from "@/store/selectors";
import { useMyBadges } from "@/queries/useBadges";
import { useKudosQuery } from "@/queries/useKudos";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber, cn } from "@/lib/utils";
import { levelFromXp } from "@/lib/xp";
import { canViewBadges, canViewSkillTree } from "@/lib/permissions";
import type { SkillNode } from "@/data";
import { useSkillsQuery } from "@/queries/useSkills";

const TIER_RING = {
  bronze: "ring-amber-700/30 bg-amber-700/10 text-amber-800",
  silver: "ring-slate-400/40 bg-slate-400/10 text-slate-600",
  gold: "ring-gold/40 bg-gold/15 text-[hsl(var(--gold))]",
} as const;

const BRANCH_LABEL: Record<SkillNode["branch"], string> = {
  teaching: "skills.branchTeaching",
  research: "skills.branchResearch",
  leadership: "skills.branchLeadership",
  digital: "skills.branchDigital",
};

export default function Profile() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user, role } = useSession();
  const { state } = useDemoData();
  const activity = useMyActivity();

  const prog = levelFromXp(user.totalXp);
  const rankName = lang === "ar" ? prog.current.nameAr : prog.current.nameEn;
  const badges = useMyBadges();
  const kudosQuery = useKudosQuery();
  const kudos = (kudosQuery.data ?? []).filter((k) => k.toId === user.id);
  const skillsQuery = useSkillsQuery();
  const SKILLS = skillsQuery.data ?? [];
  const showBadges = canViewBadges(role);
  const showSkills = canViewSkillTree(role);

  return (
    <div className="space-y-6">
      <PageHeader title={t("profile.title")} />

      {/* Identity card */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <PersonAvatar person={user} size="lg" />
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{t2(user.name)}</h2>
                <Badge variant="gold" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {rankName}
                </Badge>
                <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t2(user.title)}</p>
              <p className="text-sm text-muted-foreground">
                {role === "admin" ? t("profile.scopeUniversityWide") : t2(user.department)} · {t2(user.college)}
              </p>
            </div>

            <Separator />

            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <InfoRow icon={IdCard} label={t("profile.employeeId")} value={user.staffId} />
              <InfoRow icon={AtSign} label={t("profile.contact")} value={user.email} />
              <InfoRow icon={MapPin} label={t("profile.office")} value={t2(user.office)} />
              <InfoRow
                icon={Sparkles}
                label={t("profile.joined")}
                value={<DateStamp date={user.joined} inline />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard icon={Sparkles} label={t("profile.lifetimeXp")} value={formatNumber(user.totalXp, lang)} />
        {showBadges && (
          <StatCard
            icon={Medal}
            label={t("profile.badgesEarned")}
            value={`${formatNumber(badges.earnedCount, lang)} / ${formatNumber(badges.total, lang)}`}
            tone="gold"
          />
        )}
        <StatCard icon={Award} label={t("profile.kudosReceived")} value={formatNumber(kudos.length, lang)} />
        <StatCard
          icon={Swords}
          label={t("profile.questsDone")}
          value={formatNumber(completedQuestCount(state, user.id), lang)}
          tone="muted"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t("profile.overview")}</TabsTrigger>
          {showBadges && <TabsTrigger value="badges">{t("profile.badgesTab")}</TabsTrigger>}
          {showSkills && <TabsTrigger value="skills">{t("profile.skillsTab")}</TabsTrigger>}
          <TabsTrigger value="history">{t("profile.historyTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.currentRank")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{rankName}</span>
                <span className="text-sm text-muted-foreground">
                  {t("common.level")} {prog.current.level}
                </span>
              </div>
              <Progress value={prog.pct} />
              {prog.next && (
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.toNextLevel", {
                    xp: formatNumber(prog.xpToNext, lang),
                    rank: lang === "ar" ? prog.next.nameAr : prog.next.nameEn,
                  })}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.kudosReceived")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kudos.slice(0, 3).map((k) => (
                <div key={k.id} className="space-y-1 border-s-2 border-primary/30 ps-3">
                  <p className="text-sm">“{k.message[lang] || k.message.en}”</p>
                  <Badge variant="gold">{t(`kudos.values.${k.value}`)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {showBadges && (
          <TabsContent value="badges">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {badges.all.map((b) => (
                <Card key={b.id} className={cn("h-full", !b.earned && "bg-muted/40")}>
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <span
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full ring-2",
                        b.earned ? TIER_RING[b.tier] : "bg-secondary text-muted-foreground ring-border grayscale",
                      )}
                    >
                      <BadgeIcon name={b.icon} className="h-6 w-6" />
                    </span>
                    <p className="text-xs font-semibold leading-tight">{t2(b.name)}</p>
                    {b.earned && b.earnedOn ? (
                      <DateStamp date={b.earnedOn} inline />
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {b.manual
                          ? t("badges.manualAward")
                          : t("badges.progressToward", { pct: formatNumber(b.progressPct ?? 0, lang) })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {showSkills && (
          <TabsContent value="skills" className="space-y-5">
            {(Object.keys(BRANCH_LABEL) as SkillNode["branch"][]).map((branch) => {
              const nodes = SKILLS.filter((s) => s.branch === branch);
              return (
                <Card key={branch}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-muted-foreground" />
                      {t(BRANCH_LABEL[branch])}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nodes.map((n) => (
                      <div key={n.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{t2(n.name)}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("skills.levelOf", { current: n.level, max: n.maxLevel })}
                          </span>
                        </div>
                        <Progress
                          value={(n.level / n.maxLevel) * 100}
                          indicatorClassName={n.state === "in-progress" ? "bg-gold" : undefined}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}

        <TabsContent value="history">
          <ActivityFeed items={activity} title={t("profile.historyTitle")} limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AtSign;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
