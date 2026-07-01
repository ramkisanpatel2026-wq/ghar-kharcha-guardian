import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ReceiptText,
  Tags,
  Wallet,
  HandCoins,
  BellRing,
  FileText,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LangToggle } from "@/components/LangToggle";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);

  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!rows;
    },
  });

  const nav: Array<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/expenses", label: t("nav.expenses"), icon: ReceiptText },
    { to: "/categories", label: t("nav.categories"), icon: Tags },
    { to: "/salary", label: t("nav.salary"), icon: Wallet },
    { to: "/udhari", label: t("nav.udhari"), icon: HandCoins },
    { to: "/reminders", label: t("nav.reminders"), icon: BellRing },
    { to: "/reports", label: t("nav.reports"), icon: FileText },
  ];
  if (isAdmin.data) nav.push({ to: "/admin", label: t("nav.admin"), icon: Shield });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+64px)] lg:pb-0">
      {/* Top bar (mobile + desktop) */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-1.5 lg:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <img
                src="/icon-512.png"
                alt=""
                className="h-8 w-8 rounded-lg"
                width={32}
                height={32}
              />
              <span className="font-semibold">{t("app.name")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={signOut}
              className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent/20 sm:inline-flex"
              aria-label="Sign out"
              title={t("common.signOut")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {menuOpen && (
          <div className="border-t border-border bg-card lg:hidden">
            <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-1 p-3">
              {nav.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      isActive(n.to) ? "bg-primary text-primary-foreground" : "hover:bg-accent/10"
                    }`}
                  >
                    <Icon size={16} />
                    {n.label}
                  </Link>
                );
              })}
              <button
                onClick={signOut}
                className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium"
              >
                <LogOut size={16} /> {t("common.signOut")}
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        {/* Desktop sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive(n.to)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {nav.slice(0, 5).map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
