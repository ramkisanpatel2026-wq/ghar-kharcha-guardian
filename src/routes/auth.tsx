import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LangToggle } from "@/components/LangToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ghar Kharcha Manager" },
      {
        name: "description",
        content:
          "Sign in or create a free Ghar Kharcha Manager account to track your family salary, expenses, savings and udhari.",
      },
      { property: "og:title", content: "Sign in — Ghar Kharcha Manager" },
      {
        property: "og:description",
        content:
          "Sign in or create a free account to track your family salary, expenses, savings and udhari month by month.",
      },
      { property: "og:url", content: "https://ghar-kharcha-guardian.lovable.app/auth" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ghar-kharcha-guardian.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created — check your email to confirm, then sign in.");
          setMode("in");
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            throw new Error(
              "Email or password is wrong. If you signed up with Google, use the Google button above — or reset your password to set one.",
            );
          }
          throw error;
        }
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="" className="h-8 w-8 rounded-lg" width={32} height={32} />
          <span className="font-semibold">{t("app.name")}</span>
        </Link>
        <LangToggle />
      </div>

      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-semibold">
          {mode === "in" ? t("auth.signIn") : t("auth.signUp")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-accent/10 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.14 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
            />
          </svg>
          {t("auth.google")}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input
            required
            type="email"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            minLength={6}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-hero hover:opacity-95 disabled:opacity-60"
          >
            {busy ? t("common.saving") : mode === "in" ? t("auth.signInCta") : t("auth.signUpCta")}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "in" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? t("auth.signUp") : t("auth.signIn")}
          </button>
        </p>
      </div>
    </div>
  );
}
