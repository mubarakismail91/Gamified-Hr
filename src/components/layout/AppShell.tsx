import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { NavLinks } from "./NavLinks";

/** Authenticated layout: portal-style navbar, persistent sidebar (lg+), footer. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Scroll to top on route change — matches portal navigation behaviour.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col app-backdrop">
      <Navbar />
      <div className="container flex flex-1 gap-8 py-6 lg:py-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28">
            <NavLinks />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
