import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/common/BrandMark";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { LanguageToggle } from "./LanguageToggle";
import { IdentitySwitcher } from "./IdentitySwitcher";
import { NotificationBell } from "./NotificationBell";
import { NavLinks } from "./NavLinks";
import { useSession } from "@/context/SessionContext";
import { useLocale } from "@/hooks/useLocale";

const PORTAL_URL = "https://iu.edu.sa/";

export function Navbar() {
  const { t } = useTranslation();
  const { t2 } = useLocale();
  const { user, role, signOut } = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Portal continuity strip */}
      <div className="hidden border-b bg-primary text-primary-foreground md:block">
        <div className="container flex h-8 items-center justify-between text-xs">
          <span className="opacity-90">{t("common.university")}</span>
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("common.backToPortal")}
          </a>
        </div>
      </div>

      <div className="container flex h-16 items-center gap-3">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("a11y.openMenu")}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80">
            <SheetTitle className="sr-only">{t("common.appName")}</SheetTitle>
            <div className="mb-4 mt-1">
              <BrandMark />
            </div>
            <Separator className="mb-4" />
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <Separator className="my-4" />
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4" />
              {t("common.backToPortal")}
            </a>
          </SheetContent>
        </Sheet>

        <Link to="/dashboard" className="flex items-center">
          <BrandMark wordmark="smUp" />
        </Link>

        <Badge variant="gold" className="ms-1 hidden lg:inline-flex">
          {t("common.prototypeBadge")}
        </Badge>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block">
            <IdentitySwitcher />
          </div>
          <div className="md:hidden">
            <IdentitySwitcher compact />
          </div>
          <LanguageToggle compact />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ms-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={t("a11y.profileMenu")}>
                <PersonAvatar person={user} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold text-foreground">{t2(user.name)}</p>
                <p className="text-xs font-normal text-muted-foreground">{t2(user.department)}</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  {t("common.role")}: {t(`roles.${role}`)}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserRound className="h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                {t("common.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
