import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { DateStamp } from "@/components/common/DateStamp";
import { useSession } from "@/context/SessionContext";
import { useUsersQuery } from "@/queries/useUsers";
import { useKudosQuery, useSendKudoMutation } from "@/queries/useKudos";
import { useLocale } from "@/hooks/useLocale";
import type { KudoEntry } from "@/api/kudoApi";

const VALUES: KudoEntry["value"][] = [
  "collaboration",
  "excellence",
  "initiative",
  "mentorship",
  "service",
  "integrity",
];

export default function Kudos() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const { user } = useSession();
  const usersQuery = useUsersQuery();
  const kudosQuery = useKudosQuery();
  const sendKudo = useSendKudoMutation();
  const peers = useMemo(() => (usersQuery.data ?? []).filter((u) => u.id !== user.id), [usersQuery.data, user.id]);
  const feed = kudosQuery.data ?? [];

  const [toId, setToId] = useState("");
  const [value, setValue] = useState<KudoEntry["value"]>("collaboration");
  const [message, setMessage] = useState("");

  const canSend = toId && message.trim().length >= 8;

  const submit = () => {
    if (!canSend) return;
    const recipient = peers.find((p) => p.id === toId);
    sendKudo.mutate(
      { toUserId: toId, value, message: message.trim() },
      {
        onSuccess: () => {
          toast.success(t("kudos.sentToast", { name: recipient ? t2(recipient.name) : "" }));
          setToId("");
          setMessage("");
          setValue("collaboration");
        },
        onError: () => toast.error(t("kudos.sendTitle")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("kudos.title")} subtitle={t("kudos.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Send form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("kudos.sendTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("kudos.recipient")}</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("kudos.recipientPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {peers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {t2(p.name)} — {t2(p.department)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("kudos.value")}</Label>
              <Select value={value} onValueChange={(v) => setValue(v as KudoEntry["value"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`kudos.values.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("kudos.message")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("kudos.messagePlaceholder")}
                rows={4}
                maxLength={280}
              />
              <p className="text-end text-[11px] text-muted-foreground">{message.length}/280</p>
            </div>

            <Button onClick={submit} disabled={!canSend || sendKudo.isPending} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {t("kudos.send")}
            </Button>
          </CardContent>
        </Card>

        {/* Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("kudos.feed")}</h2>
          <div className="space-y-3">
            {feed.map((k) => {
              const from = k.fromStaff;
              const to = k.toStaff;
              return (
                <Card key={k.id}>
                  <CardContent className="flex gap-3 p-4">
                    <PersonAvatar person={from} size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{t2(from.name)}</span>{" "}
                        <span className="text-muted-foreground">{t("kudos.gave")}</span>{" "}
                        <span className="font-semibold">{t2(to.name)}</span>
                      </p>
                      <p className="text-sm text-foreground/90">“{k.message[lang] || k.message.en}”</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <Badge variant="gold">{t(`kudos.values.${k.value}`)}</Badge>
                        <DateStamp date={k.at} relative inline />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
