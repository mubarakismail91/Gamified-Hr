import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/common/BrandMark";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { DownloadMyDataButton } from "@/components/privacy/DownloadMyDataButton";
import { useSession } from "@/context/SessionContext";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/lib/utils";
import { getPrivacyPolicy } from "@/api/privacyApi";

const SECTIONS = ["who", "what", "why", "visibility", "employment", "retention", "rights", "security"] as const;

/** Public privacy notice (PDPL). Retention periods come from the server, so the page always matches what runs. */
export default function Privacy() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { authed } = useSession();
  const policy = useQuery({ queryKey: ["privacy", "policy"], queryFn: getPrivacyPolicy }).data;
  const n = (v: number | undefined) => (v === undefined ? "…" : formatNumber(v, lang));

  const body = (key: (typeof SECTIONS)[number]) => {
    if (key === "retention") {
      return (
        <ul className="list-disc space-y-1 ps-5">
          <li>{t("privacy.retention.notifications", { days: n(policy?.notificationsDays) })}</li>
          <li>{t("privacy.retention.accounts", { days: n(policy?.deactivatedAccountsDays) })}</li>
          <li>{t("privacy.retention.sessions", { days: n(policy?.revokedSessionsDays) })}</li>
          <li>{t("privacy.retention.research")}</li>
          <li>{t("privacy.retention.surveys")}</li>
        </ul>
      );
    }
    const items = t(`privacy.sections.${key}.items`, { returnObjects: true }) as string[];
    return (
      <ul className="list-disc space-y-1 ps-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-3">
          <Link to={authed ? "/dashboard" : "/"} className="flex items-center gap-2">
            <BrandMark />
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="container max-w-3xl space-y-4 py-8">
        <Link to={authed ? "/dashboard" : "/"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("privacy.back")}
        </Link>
        <h1 className="text-2xl font-bold">{t("privacy.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("privacy.intro")}</p>
        {SECTIONS.map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">{t(`privacy.sections.${key}.title`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {body(key)}
              {key === "rights" && authed && <DownloadMyDataButton />}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
