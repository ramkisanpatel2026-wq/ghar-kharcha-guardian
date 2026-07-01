import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Ghar Kharcha" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: Admin,
});

function Admin() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [profiles, expenses, udhari] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, language, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("expenses").select("amount, user_id"),
        supabase.from("udhari").select("id"),
      ]);
      const totalPerUser = new Map<string, number>();
      for (const r of expenses.data ?? []) {
        totalPerUser.set(r.user_id, (totalPerUser.get(r.user_id) ?? 0) + Number(r.amount));
      }
      const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
      const newSignups = (profiles.data ?? []).filter(
        (p) => new Date(p.created_at).getTime() > cutoff,
      ).length;
      return {
        users: (profiles.data ?? []).map((p) => ({
          ...p,
          total: totalPerUser.get(p.user_id) ?? 0,
        })),
        totalUsers: profiles.data?.length ?? 0,
        totalExpenses: (expenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        totalUdhari: udhari.data?.length ?? 0,
        newSignups,
      };
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("admin.totalUsers")} value={String(q.data?.totalUsers ?? "—")} />
        <Stat label={t("admin.signups")} value={String(q.data?.newSignups ?? "—")} />
        <Stat label={t("admin.totalExpenses")} value={fmtINR(q.data?.totalExpenses)} />
        <Stat label={t("admin.totalUdhari")} value={String(q.data?.totalUdhari ?? "—")} />
      </section>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 font-semibold">{t("admin.users")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Lang</th>
                <th className="py-2">Joined</th>
                <th className="py-2 text-right">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.users ?? []).map((u) => (
                <tr key={u.user_id} className="border-t border-border">
                  <td className="py-2">{u.full_name ?? "—"}</td>
                  <td className="py-2 uppercase text-muted-foreground">{u.language}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right font-medium">{fmtINR(u.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}
