import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemographicsBar } from "@/components/admin/Charts";
import { useDemographicsQuery } from "@/queries/useAnalytics";
import { useSdtScoresByGroupQuery, useSurveyRoundsQuery } from "@/queries/useSurveys";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import type { DemographicDimension } from "@/api/surveyApi";

const LATEST = "__latest__";

/**
 * Admin → Demographics. Headcounts by gender, generation and job role; engagement and SDT survey
 * averages by group. Every per-group figure is hidden for groups smaller than 5 (the server does
 * the hiding — this component only renders what it is given).
 */
export function DemographicsPanel() {
  const { t } = useTranslation();
  const { t2, lang } = useLocale();
  const demographics = useDemographicsQuery();
  const rounds = useSurveyRoundsQuery();

  const [engagementDim, setEngagementDim] = useState<DemographicDimension>("generation");
  const [sdtDim, setSdtDim] = useState<DemographicDimension>("generation");
  const [roundId, setRoundId] = useState<string>(LATEST);
  const sdt = useSdtScoresByGroupQuery(sdtDim, roundId === LATEST ? undefined : roundId);

  const minGroup = demographics.data?.minGroupSize ?? 5;
  const engagementRows = demographics.data?.engagement[engagementDim] ?? [];
  const n = formatNumber(minGroup, lang); // ٥ in Arabic, 5 in English
  const hidden = t("admin.demoHidden", { n });

  const dimensionSelect = (value: DemographicDimension, onChange: (v: DemographicDimension) => void) => (
    <Select value={value} onValueChange={(v) => onChange(v as DemographicDimension)}>
      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="generation">{t("admin.generationLabel")}</SelectItem>
        <SelectItem value="staffType">{t("admin.staffTypeLabel")}</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.filterGender")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DemographicsBar data={demographics.data?.byGender ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.generationLabel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DemographicsBar data={demographics.data?.byGeneration ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.staffTypeLabel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DemographicsBar data={demographics.data?.byStaffType ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>{t("admin.demoEngagementTitle")}</CardTitle>
          {dimensionSelect(engagementDim, setEngagementDim)}
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.demoGroup")}</TableHead>
                <TableHead className="text-end">{t("admin.demoHeadcount")}</TableHead>
                <TableHead className="text-end">{t("admin.demoAvgXp")}</TableHead>
                <TableHead className="text-end">{t("admin.demoParticipation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagementRows.map((r) => (
                <TableRow key={r.key.en}>
                  <TableCell>{t2(r.key)}</TableCell>
                  <TableCell className="text-end">{formatNumber(r.headcount, lang)}</TableCell>
                  {r.suppressed ? (
                    <TableCell colSpan={2} className="text-end text-xs text-muted-foreground">
                      {r.headcount === 0 ? t("admin.demoNoStaff") : hidden}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="text-end">{formatNumber(r.avgXp ?? 0, lang)}</TableCell>
                      <TableCell className="text-end">{formatNumber(r.participationRate ?? 0, lang)}%</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">{t("admin.demoEngagementNote", { n })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>{t("admin.demoSdtTitle")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={roundId} onValueChange={setRoundId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={LATEST}>{t("admin.demoLatestClosedRound")}</SelectItem>
                {(rounds.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {t2(r.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dimensionSelect(sdtDim, setSdtDim)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sdt.data?.suppressed ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t("admin.sdtScoresSuppressed")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.demoGroup")}</TableHead>
                  <TableHead className="text-end">{t("admin.demoRespondents")}</TableHead>
                  {(sdt.data?.groups.find((g) => g.scores.length)?.scores ?? []).map((s) => (
                    <TableHead key={s.scale.en} className="text-end">{t2(s.scale)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sdt.data?.groups ?? []).map((g) => {
                  const columns = sdt.data?.groups.find((x) => x.scores.length)?.scores.length ?? 3;
                  return (
                    <TableRow key={g.key}>
                      <TableCell>{t2(g.label)}</TableCell>
                      {g.suppressed ? (
                        <TableCell colSpan={columns + 1} className="text-end text-xs text-muted-foreground">{hidden}</TableCell>
                      ) : g.respondents === 0 ? (
                        <TableCell colSpan={columns + 1} className="text-end text-xs text-muted-foreground">
                          {t("admin.demoNoResponses")}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-end">{formatNumber(g.respondents ?? 0, lang)}</TableCell>
                          {g.scores.map((s) => (
                            <TableCell key={s.scale.en} className="text-end">
                              {s.score.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { minimumFractionDigits: 1 })}
                            </TableCell>
                          ))}
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">{t("admin.demoSdtNote", { n })}</p>
        </CardContent>
      </Card>
    </div>
  );
}
