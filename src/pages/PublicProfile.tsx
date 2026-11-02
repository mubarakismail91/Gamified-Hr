import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AtSign, Award, IdCard, MapPin, Medal, Network, Sparkles, Swords } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { PersonLink } from "@/components/common/PersonLink";
import { DateStamp } from "@/components/common/DateStamp";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { useLocale } from "@/hooks/useLocale";
import { usePublicProfileQuery } from "@/queries/useProfile";
import { formatNumber, cn } from "@/lib/utils";
import { levelFromXp } from "@/lib/xp";
import type { SkillNode } from "@/data";

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

/** Someone else's profile: achievements and badges to look at, nothing to edit. */
export default function PublicProfile() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { userId } = useParams();
  const query = usePublicProfileQuery(userId);
  const p = query.data;

  if (query.isLoading) return <PageHeader title={t("profile.title")} />;
  if (query.isError || !p) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("profile.title")} />
        <EmptyState icon={Medal} title={t("profile.notFound")} />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/leaderboard">{t("profile.backToLeaderboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }
  // Your own profile has the full, editable-context page.
  if (p.isSelf) return <Navigate to="/profile" replace />;

  const prog = levelFromXp(p.totalXp);
  const rankName = lang === "ar" ? prog.current.nameAr : prog.current.nameEn;
  const badges = p.badges;
  const skills = p.skills;

  return (
    <div className="space-y-6">
      <PageHeader title={t2(p.name)} subtitle={t("profile.viewingOnly", { name: t2(p.name) })} />

      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <PersonAvatar person={p} size="lg" />
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{t2(p.name)}</h2>
                {p.hasEngagement && (
                  <Badge variant="gold" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {rankName}
                  </Badge>
                )}
                <Badge variant="secondary">{t(`roles.${p.role}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t2(p.title)}</p>
              <p className="text-sm text-muted-foreground">
                {p.role === "admin" ? t("profile.scopeUniversityWide") : t2(p.department)} · {t2(p.college)}
              </p>
            </div>

            <Separator />

            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {p.contact && (
                <>
                  <InfoRow icon={IdCard} label={t("profile.employeeId")} value={p.contact.staffId} />
                  <InfoRow icon={AtSign} label={t("profile.contact")} value={p.contact.email} />
                  <InfoRow icon={MapPin} label={t("profile.office")} value={t2(p.contact.office)} />
                </>
              )}
              <InfoRow icon={Sparkles} label={t("profile.joined")} value={<DateStamp date={p.joined} inline />} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!p.hasEngagement ? (
        <EmptyState icon={Medal} title={t("profile.noEngagement")} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={Sparkles} label={t("profile.lifetimeXp")} value={formatNumber(p.totalXp, lang)} />
            {badges && (
              <StatCard
                icon={Medal}
                label={t("profile.badgesEarned")}
                value={`${formatNumber(badges.length, lang)} / ${formatNumber(p.totalBadges, lang)}`}
                tone="gold"
              />
            )}
            <StatCard icon={Award} label={t("profile.kudosReceived")} value={formatNumber(p.kudosReceived, lang)} />
            {p.questsCompleted !== null && (
              <StatCard
                icon={Swords}
                label={t("profile.questsDone")}
                value={formatNumber(p.questsCompleted, lang)}
                tone="muted"
              />
            )}
          </div>

          <Tabs defaultValue={badges ? "badges" : "kudos"}>
            <TabsList className="flex-wrap">
              {badges && <TabsTrigger value="badges">{t("profile.badgesTab")}</TabsTrigger>}
              {skills && <TabsTrigger value="skills">{t("profile.skillsTab")}</TabsTrigger>}
              <TabsTrigger value="kudos">{t("profile.recentKudos")}</TabsTrigger>
            </TabsList>

            {badges && (
              <TabsContent value="badges">
                {badges.length === 0 ? (
                  <EmptyState icon={Medal} title={t("profile.noBadges")} />
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {badges.map((b) => (
                      <Card key={b.id} className="h-full">
                        <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                          <span
                            className={cn(
                              "flex h-14 w-14 items-center justify-center rounded-full ring-2",
                              TIER_RING[b.tier],
                            )}
                          >
                            <BadgeIcon name={b.icon} className="h-6 w-6" />
                          </span>
                          <p className="text-xs font-semibold leading-tight">{t2(b.name)}</p>
                          <DateStamp date={b.earnedOn} inline />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {skills && (
              <TabsContent value="skills" className="space-y-5">
                {(Object.keys(BRANCH_LABEL) as SkillNode["branch"][]).map((branch) => (
                  <Card key={branch}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-muted-foreground" />
                        {t(BRANCH_LABEL[branch])}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {skills
                        .filter((s) => s.branch === branch)
                        .map((n) => (
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
                ))}
              </TabsContent>
            )}

            <TabsContent value="kudos" className="space-y-3">
              {p.recentKudos.length === 0 ? (
                <EmptyState icon={Award} title={t("profile.noKudos")} />
              ) : (
                p.recentKudos.map((k) => (
                  <Card key={k.id}>
                    <CardContent className="space-y-1.5 p-4">
                      <p className="text-sm">“{k.message[lang] || k.message.en}”</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="gold">{t(`kudos.values.${k.value}`)}</Badge>
                        <PersonLink id={k.from.id} className="font-medium text-foreground">
                          {t("profile.kudosFrom", { name: t2(k.from.name) })}
                        </PersonLink>
                        <DateStamp date={k.at} relative inline />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
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
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
