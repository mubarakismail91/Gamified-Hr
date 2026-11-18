import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Flag, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SquadCard } from "@/components/squads/SquadCard";
import { ChallengeCard } from "@/components/squads/ChallengeCard";
import { MemberPicker } from "@/components/squads/MemberPicker";
import { useSession } from "@/context/SessionContext";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { MAX_SQUAD_SIZE, MIN_RANKED_MEMBERS, type ChallengeMetric, type Squad } from "@/api/squadApi";
import {
  useAddSquadMemberMutation,
  useChallengesQuery,
  useCreateChallengeMutation,
  useCreateSquadMutation,
  useDisbandSquadMutation,
  useJoinChallengeMutation,
  useMySquadsQuery,
  useRemoveSquadMemberMutation,
  useRespondToInviteMutation,
  useSquadCandidatesQuery,
  useSquadListQuery,
} from "@/queries/useSquads";

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && typeof err.response?.data?.message === "string") return err.response.data.message;
  return fallback;
}

/** Datetime-local value for "now + days" (local time), for the challenge form defaults. */
function localInput(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Squads (FR9). Employees: their squad, invitations, creating a squad, and challenges.
 * Managers/admins: the squads they can manage, assigning members, and publishing challenges.
 */
export default function Squads() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user, role } = useSession();
  const isEmployee = role === "employee";

  const mine = useMySquadsQuery(isEmployee);
  const all = useSquadListQuery(!isEmployee);
  const challenges = useChallengesQuery();

  const createSquad = useCreateSquadMutation();
  const addMember = useAddSquadMemberMutation();
  const respond = useRespondToInviteMutation();
  const removeMember = useRemoveSquadMemberMutation();
  const disband = useDisbandSquadMutation();
  const createChallenge = useCreateChallengeMutation();
  const joinChallenge = useJoinChallengeMutation();

  // Create-squad dialog / add-people dialog share the picker.
  const [creating, setCreating] = useState(false);
  const [addingTo, setAddingTo] = useState<Squad | null>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const pickerOpen = creating || !!addingTo;
  const candidates = useSquadCandidatesQuery(pickerOpen);

  const [confirm, setConfirm] = useState<{ kind: "leave" | "remove" | "disband"; squad: Squad; userId?: string } | null>(null);

  const [newChallenge, setNewChallenge] = useState(false);
  const [ch, setCh] = useState({
    titleEn: "",
    descriptionEn: "",
    metric: "quests_completed" as ChallengeMetric,
    target: 10,
    bonusXp: 50,
    startsAt: localInput(0),
    endsAt: localInput(30),
  });

  const mySquad = mine.data?.squad ?? null;
  const invites = mine.data?.invites ?? [];
  const squads = isEmployee ? (mySquad ? [mySquad] : []) : (all.data ?? []);

  const onError = (fallback: string) => (err: unknown) => toast.error(errorMessage(err, fallback));

  const openCreate = () => {
    setName("");
    setPicked([]);
    setCreating(true);
  };
  const openAdd = (s: Squad) => {
    setPicked([]);
    setAddingTo(s);
  };
  const closePicker = () => {
    setCreating(false);
    setAddingTo(null);
  };

  const submitPicker = async () => {
    try {
      if (creating) {
        await createSquad.mutateAsync({ name: name.trim(), memberIds: picked });
        toast.success(isEmployee ? t("squads.createdInvited") : t("squads.createdAssigned"));
      } else if (addingTo) {
        for (const userId of picked) await addMember.mutateAsync({ squadId: addingTo.id, userId });
        toast.success(isEmployee ? t("squads.invitesSent") : t("squads.membersAdded"));
      }
      closePicker();
    } catch (err) {
      onError(t("squads.genericError"))(err);
    }
  };

  const doConfirm = () => {
    if (!confirm) return;
    const done = () => setConfirm(null);
    if (confirm.kind === "disband") {
      disband.mutate(confirm.squad.id, { onSuccess: done, onError: onError(t("squads.genericError")) });
    } else {
      removeMember.mutate(
        { squadId: confirm.squad.id, userId: confirm.userId! },
        { onSuccess: done, onError: onError(t("squads.genericError")) },
      );
    }
  };

  const submitChallenge = () =>
    createChallenge.mutate(
      { ...ch, startsAt: new Date(ch.startsAt).toISOString(), endsAt: new Date(ch.endsAt).toISOString() },
      {
        onSuccess: () => {
          setNewChallenge(false);
          toast.success(t("squads.challengePublished"));
        },
        onError: onError(t("squads.genericError")),
      },
    );

  const spaceLeft = addingTo ? MAX_SQUAD_SIZE - addingTo.members.length : MAX_SQUAD_SIZE - (isEmployee ? 1 : 0);
  const joinBlocked = !mySquad
    ? t("squads.joinNeedsSquad")
    : !mySquad.ranked
      ? t("squads.joinNeedsMembers", { n: formatNumber(MIN_RANKED_MEMBERS, lang) })
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("squads.title")}
        subtitle={t("squads.subtitle")}
        actions={
          (!isEmployee || !mySquad) && (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("squads.newSquad")}
            </Button>
          )
        }
      />

      {/* Invitations (employees) */}
      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("squads.invitations")}</h2>
          {invites.map((s) => (
            <SquadCard
              key={s.id}
              squad={s}
              viewerId={user.id}
              footer={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      respond.mutate({ squadId: s.id, accept: true }, { onError: onError(t("squads.genericError")) })
                    }
                    disabled={respond.isPending}
                  >
                    {t("squads.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond.mutate({ squadId: s.id, accept: false })}
                    disabled={respond.isPending}
                  >
                    {t("squads.decline")}
                  </Button>
                  {mySquad && <p className="w-full text-xs text-muted-foreground">{t("squads.leaveFirst")}</p>}
                </div>
              }
            />
          ))}
        </section>
      )}

      {/* Squads */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{isEmployee ? t("squads.mySquad") : t("squads.allSquads")}</h2>
        {squads.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isEmployee ? t("squads.noSquadYet") : t("squads.noSquads")}
            hint={isEmployee ? t("squads.noSquadHint") : undefined}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {squads.map((s) => (
              <SquadCard
                key={s.id}
                squad={s}
                viewerId={user.id}
                onAdd={() => openAdd(s)}
                onRemove={(userId, self) => setConfirm({ kind: self ? "leave" : "remove", squad: s, userId })}
                onDisband={() => setConfirm({ kind: "disband", squad: s })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Challenges */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("squads.challenges")}</h2>
          {!isEmployee && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setNewChallenge(true)}>
              <Flag className="h-4 w-4" />
              {t("squads.newChallenge")}
            </Button>
          )}
        </div>
        {(challenges.data ?? []).length === 0 ? (
          <EmptyState icon={Flag} title={t("squads.noChallenges")} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(challenges.data ?? []).map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                canJoin={!joinBlocked}
                joinBlockedReason={joinBlocked}
                joining={joinChallenge.isPending}
                onJoin={() =>
                  joinChallenge.mutate(c.id, {
                    onSuccess: () => toast.success(t("squads.joinedChallenge")),
                    onError: onError(t("squads.genericError")),
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Create squad / add people */}
      <Dialog open={pickerOpen} onOpenChange={(o) => !o && closePicker()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? t("squads.newSquad") : t("squads.addPeopleTo", { name: addingTo?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {creating && (
              <div className="space-y-1.5">
                <Label>{t("squads.nameLabel")}</Label>
                <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t("squads.namePlaceholder")} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">{isEmployee ? t("squads.inviteExplain") : t("squads.assignExplain")}</p>
            <MemberPicker people={candidates.data ?? []} selected={picked} onChange={setPicked} max={Math.max(0, spaceLeft)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePicker}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitPicker}
              disabled={(creating ? name.trim().length < 2 : picked.length === 0) || createSquad.isPending || addMember.isPending}
            >
              {creating ? t("squads.create") : isEmployee ? t("squads.sendInvites") : t("squads.addPeople")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave / remove / disband */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm ? t(`squads.confirm.${confirm.kind}Title`) : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm
              ? t(`squads.confirm.${confirm.kind}Body`, {
                  squad: confirm.squad.name,
                  name: t2(confirm.squad.members.find((m) => m.user.id === confirm.userId)?.user.name ?? { en: "", ar: "" }),
                })
              : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={doConfirm} disabled={removeMember.isPending || disband.isPending}>
              {confirm ? t(`squads.confirm.${confirm.kind}Action`) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New challenge (managers/admins) */}
      <Dialog open={newChallenge} onOpenChange={setNewChallenge}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("squads.newChallenge")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("squads.challengeTitle")}</Label>
              <Input value={ch.titleEn} maxLength={80} onChange={(e) => setCh({ ...ch, titleEn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("squads.challengeDescription")}</Label>
              <Textarea value={ch.descriptionEn} maxLength={500} onChange={(e) => setCh({ ...ch, descriptionEn: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("squads.metric")}</Label>
                <Select value={ch.metric} onValueChange={(v) => setCh({ ...ch, metric: v as ChallengeMetric })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quests_completed">{t("squads.metricQuests")}</SelectItem>
                    <SelectItem value="xp_earned">{t("squads.metricXp")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("squads.target")}</Label>
                <Input type="number" min={1} value={ch.target} onChange={(e) => setCh({ ...ch, target: Number(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("squads.startsAt")}</Label>
                <Input type="datetime-local" value={ch.startsAt} onChange={(e) => setCh({ ...ch, startsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("squads.endsAt")}</Label>
                <Input type="datetime-local" value={ch.endsAt} onChange={(e) => setCh({ ...ch, endsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("squads.bonusLabel")}</Label>
                <Input type="number" min={5} max={500} value={ch.bonusXp} onChange={(e) => setCh({ ...ch, bonusXp: Number(e.target.value) || 5 })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("squads.challengeExplain", { n: formatNumber(MIN_RANKED_MEMBERS, lang) })}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChallenge(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitChallenge} disabled={ch.titleEn.trim().length < 3 || createChallenge.isPending}>
              {t("squads.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Just for screen readers / context on the rules */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">{t("squads.rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>{t("squads.rule1", { min: formatNumber(MIN_RANKED_MEMBERS, lang), max: formatNumber(MAX_SQUAD_SIZE, lang) })}</p>
          <p>{t("squads.rule2")}</p>
          <p>{t("squads.rule3")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
