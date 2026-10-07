import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LangToggle } from "@/components/LangToggle";
import { isNativeApp } from "@/lib/capacitor-native";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const disposableEmailDomains = new Set([
    "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
    "dispostable.com", "emailondeck.com", "fakeinbox.com", "getairmail.com",
    "getnada.com", "guerrillamail.com", "guerrillamail.net", "inboxkitten.com",
    "maildrop.cc", "mailinator.com", "mailnesia.com", "mintemail.com",
    "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com",
    "tempmail.com", "temp-mail.org", "throwawaymail.com", "trashmail.com",
    "yopmail.com", "yopmail.fr", "disposablemail.com", "fake-email.com",
  ]);

  const isDisposableEmail = (value: string) => {
    const domain = value.trim().toLowerCase().split("@").at(-1) ?? "";
    return [...disposableEmailDomains].some(
      (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
    );
  };

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingEmail) return;
    setBusy(true);
    try {
      if (mode === "up") {
        const normalizedEmail = email.trim().toLowerCase();
        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
          throw new Error(t("auth.invalidName"));
        }
        if (password !== confirmPassword) throw new Error(t("auth.passwordMismatch"));
        if (isDisposableEmail(normalizedEmail)) {
          throw new Error(t("auth.disposableEmail"));
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        setPendingEmail(normalizedEmail);
        setOtp("");
        setResendSeconds(60);
        toast.success(t("auth.otpSent"));
        return;
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

  const verifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEmail || !/^\d{6}$/.test(otp)) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      toast.success(t("auth.verified"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.invalidOtp"));
    } finally {
      setBusy(false);
    }
  };

  const resendSignupOtp = async () => {
    if (!pendingEmail || busy || resendSeconds > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setResendSeconds(60);
      setOtp("");
      toast.success(t("auth.otpSent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.otpResendFailed"));
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
    if (busy) return; // never start two sign-in flows at once
    if (isNativeApp()) {
      // Android: secure Chrome sheet + one-time code back into the app.
      setBusy(true);
      try {
        const { startNativeGoogle } = await import("@/lib/native-google");
        await startNativeGoogle();
      } catch {
        toast.error("Google login shuru nahi ho paya. Internet check karke dobara try karein.");
      } finally {
        setBusy(false);
      }
      return;
    }
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
          {pendingEmail ? t("auth.verifyEmail") : mode === "in" ? t("auth.signIn") : t("auth.signUp")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        {pendingEmail ? (
          <>
            <p className="mt-5 text-sm text-muted-foreground">
              {t("auth.enterOtp")} <span className="font-medium text-foreground">{pendingEmail}</span>
            </p>
            <form onSubmit={verifySignupOtp} className="mt-5 space-y-3">
              <input
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                aria-label={t("auth.otp")}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-hero hover:opacity-95 disabled:opacity-60"
              >
                {busy ? t("common.saving") : t("auth.verifyOtp")}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={resendSignupOtp}
                disabled={busy || resendSeconds > 0}
                className="font-medium text-primary hover:underline disabled:opacity-60"
              >
                {resendSeconds > 0 ? `${t("auth.resendOtp")} (${resendSeconds}s)` : t("auth.resendOtp")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingEmail("");
                  setOtp("");
                  setResendSeconds(0);
                }}
                className="font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {t("auth.changeEmail")}
              </button>
            </div>
          </>
        ) : <>
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
            required={mode === "up"}
            maxLength={100}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input
            required
            type="email"
            maxLength={255}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            minLength={mode === "up" ? 8 : 6}
            maxLength={128}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "up" && (
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-hero hover:opacity-95 disabled:opacity-60"
          >
            {busy ? t("common.saving") : mode === "in" ? t("auth.signInCta") : t("auth.signUpCta")}
          </button>
        </form>

        {mode === "in" && (
          <p className="mt-3 text-center text-xs">
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="font-medium text-primary hover:underline disabled:opacity-60"
            >
              Forgot password?
            </button>
          </p>
        )}



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
        </>}
      </div>
    </div>
  );
}
