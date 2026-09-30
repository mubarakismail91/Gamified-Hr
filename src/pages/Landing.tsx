import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, Gauge, HeartHandshake, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/common/BrandMark";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useSession } from "@/context/SessionContext";
import { useLocale } from "@/hooks/useLocale";

type Phase = "idle" | "connecting" | "verifying" | "redirecting";

const PORTAL_URL = "https://iu.edu.sa/";

export default function Landing() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const { authed, signIn } = useSession();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (authed) navigate("/dashboard", { replace: true });
  }, [authed, navigate]);

  // Simulated SSO handshake — purely visual so stakeholders see the integration.
  useEffect(() => {
    if (phase === "idle") return;
    const steps: Phase[] = ["connecting", "verifying", "redirecting"];
    const idx = steps.indexOf(phase);
    const timer = setTimeout(() => {
      if (idx < steps.length - 1) {
        setPhase(steps[idx + 1]);
      } else {
        signIn();
        navigate("/dashboard", { replace: true });
      }
    }, 850);
    return () => clearTimeout(timer);
  }, [phase, signIn, navigate]);

  const pillars = [
    { icon: Compass, title: t("landing.pillar1Title"), body: t("landing.pillar1Body") },
    { icon: Gauge, title: t("landing.pillar2Title"), body: t("landing.pillar2Body") },
    { icon: HeartHandshake, title: t("landing.pillar3Title"), body: t("landing.pillar3Body") },
  ];

  return (
    <div className="relative flex min-h-screen flex-col app-backdrop">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Badge variant="gold" className="hidden sm:inline-flex">
              {t("common.prototypeBadge")}
            </Badge>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center py-14">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <div className="space-y-6 text-center lg:text-start">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t("landing.tagline")}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t("landing.heading")}
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground lg:mx-0">
              {t("landing.subheading")}
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Button size="lg" className="w-full gap-2 sm:w-auto" onClick={() => setPhase("connecting")}>
                <LogIn className="h-5 w-5" />
                {t("common.signInPortal")}
              </Button>
              <a
                href={PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("common.backToPortal")}
              </a>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-success" />
              {t("landing.ssoNote")}
            </p>
          </div>

          {/* Pillars card */}
          <Card className="shadow-elevated">
            <CardContent className="space-y-5 p-6">
              {pillars.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="container py-5 text-center text-xs text-muted-foreground">
          {t("landing.footerNote")}
        </div>
      </footer>

      {/* SSO handshake overlay */}
      {phase !== "idle" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          dir={dir}
        >
          <Card className="w-[min(92vw,26rem)] shadow-elevated">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <BrandMark showWordmark={false} />
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {phase === "connecting" && t("landing.ssoConnecting")}
                  {phase === "verifying" && t("landing.ssoVerifying")}
                  {phase === "redirecting" && t("landing.ssoRedirecting")}
                </p>
                <p className="text-xs text-muted-foreground">{t("common.university")}</p>
              </div>
              <div className="flex gap-1.5">
                {["connecting", "verifying", "redirecting"].map((s, i) => (
                  <span
                    key={s}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      ["connecting", "verifying", "redirecting"].indexOf(phase) >= i
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
