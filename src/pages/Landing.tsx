import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Compass, Gauge, HeartHandshake, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/common/BrandMark";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import { isAxiosError } from "axios";

const PORTAL_URL = "https://iu.edu.sa/";

export default function Landing() {
  const { t } = useTranslation();
  const { authed, authLoading } = useSession();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authed) navigate("/dashboard", { replace: true });
  }, [authed, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(typeof message === "string" ? message : t("landing.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  const pillars = [
    { icon: Compass, title: t("landing.pillar1Title"), body: t("landing.pillar1Body") },
    { icon: Gauge, title: t("landing.pillar2Title"), body: t("landing.pillar2Body") },
    { icon: HeartHandshake, title: t("landing.pillar3Title"), body: t("landing.pillar3Body") },
  ];

  // Avoid a login-form flash for an already-logged-in user whose session is
  // still being restored from the refresh cookie (see AuthContext).
  if (authLoading) return null;

  return (
    <div className="relative flex min-h-screen flex-col app-backdrop">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center py-14">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy + login form */}
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

            <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 text-start lg:mx-0">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">{t("landing.emailLabel")}</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("landing.emailPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">{t("landing.passwordLabel")}</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <Button type="submit" size="lg" className="w-full gap-2 sm:w-auto" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  {submitting ? t("landing.signingIn") : t("landing.signInButton")}
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
            </form>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-success" />
              {t("landing.loginNote")}
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
    </div>
  );
}
