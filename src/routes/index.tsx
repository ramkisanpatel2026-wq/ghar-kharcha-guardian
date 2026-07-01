import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useUser } from "@/lib/auth";
import { LangToggle } from "@/components/LangToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghar Kharcha Manager — Family Budget & Expense Tracker" },
      {
        name: "description",
        content:
          "Simple, printable monthly budgeting for Indian families. Track salary, ration, petrol, udhari and more — in Hindi or English.",
      },
      { property: "og:title", content: "Ghar Kharcha Manager" },
      {
        property: "og:description",
        content: "Family budgeting made simple. English & Hindi.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const { user, loading } = useUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <img src="/icon-512.png" alt="" className="h-9 w-9 rounded-xl" width={36} height={36} />
          <span className="text-lg font-semibold">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          {!loading &&
            (user ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("auth.signIn")}
              </Link>
            ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-16">
        <section className="grid items-center gap-10 sm:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              For middle-class families · हिंदी + English
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {t("app.name")}
              <span className="block text-primary">Manager</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              {t("app.tagline")} Track salary, expenses, savings, udhari, ration and petrol —
              print a clean monthly bill at the end of every month.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={user ? "/dashboard" : "/auth"}
                className="rounded-lg gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-hero hover:opacity-95"
              >
                {user ? t("nav.dashboard") : t("auth.signUp")}
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-accent/10"
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-card p-6 shadow-hero">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">This month</p>
                  <p className="text-2xl font-semibold">₹42,300 <span className="text-sm text-success">saved</span></p>
                </div>
                <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">Nov</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { l: "Income", v: "₹65,000" },
                  { l: "Expense", v: "₹22,700" },
                  { l: "Ration", v: "₹7,200" },
                  { l: "Petrol", v: "₹3,400" },
                ].map((c) => (
                  <div key={c.l} className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{c.l}</p>
                    <p className="mt-1 font-semibold">{c.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            ["Salary & savings", "Multiple income sources, monthly balance and savings goals."],
            ["Udhari", "Track money you gave or borrowed with reminders."],
            ["Printable bill", "Beautiful PDF monthly report — download or share on WhatsApp."],
            ["Ration & petrol", "Dedicated tracking for grocery and fuel spending."],
            ["Family expenses", "Log money given to wife, children and household."],
            ["Works offline-ish", "Installable on Android & iPhone as a mobile app."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
