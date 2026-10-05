/**
 * Android in-app Google login: Chrome Custom Tab + one-time code (PKCE-style).
 * Browser-only; call from event handlers / effects.
 */
import { supabase } from "@/integrations/supabase/client";
import { redeemNativeHandoff } from "./native-auth.functions";

const SITE = "https://ghar-kharcha-guardian.lovable.app";
const KEY = "gk_native_verifier";
const DONE = "gk_native_done_codes";
const PREFIX = "com.gharkharcha.manager://auth-callback";

// Codes already handled in this page (appUrlOpen + getLaunchUrl can both fire).
const inFlight = new Set<string>();

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function wasHandled(code: string) {
  try {
    return (JSON.parse(localStorage.getItem(DONE) ?? "[]") as string[]).includes(code);
  } catch {
    return false;
  }
}
function markHandled(code: string) {
  try {
    const list = (JSON.parse(localStorage.getItem(DONE) ?? "[]") as string[]).slice(-9);
    localStorage.setItem(DONE, JSON.stringify([...list, code]));
  } catch {
    /* ignore */
  }
}

export async function startNativeGoogle() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  // localStorage (not sessionStorage): survives Android recreating the activity
  // while Chrome is in front.
  localStorage.setItem(KEY, verifier);
  const challenge = b64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: `${SITE}/auth/native?challenge=${challenge}`, toolbarColor: "#0F5132" });
}

export function isNativeAuthCallback(url: string | undefined | null): url is string {
  return !!url && url.startsWith(PREFIX);
}

/**
 * Handles com.gharkharcha.manager://auth-callback?code=...
 * Returns true when a session was created, false when the URL was ignored.
 */
export async function handleNativeCallback(url: string): Promise<boolean> {
  if (!isNativeAuthCallback(url)) return false;
  const { Browser } = await import("@capacitor/browser");
  void Browser.close().catch(() => {});
  const params = new URL(url.replace("com.gharkharcha.manager://", "https://x/")).searchParams;
  const err = params.get("error");
  if (err) {
    console.warn("[native-google] callback error:", err);
    throw new Error(err);
  }
  const code = params.get("code");
  if (!code) throw new Error("Google login was interrupted. Please try again.");
  if (inFlight.has(code) || wasHandled(code)) return false; // never finalize twice
  inFlight.add(code);

  const verifier = localStorage.getItem(KEY);
  if (!verifier) {
    console.warn("[native-google] missing verifier for callback");
    throw new Error("Google login was interrupted. Please try again.");
  }

  let refreshToken: string;
  try {
    ({ refreshToken } = await redeemNativeHandoff({ data: { code, verifier } }));
  } catch (e) {
    console.error("[native-google] redeem failed:", e instanceof Error ? e.message : e);
    throw e instanceof Error ? e : new Error("Google login could not be completed.");
  }
  localStorage.removeItem(KEY);
  markHandled(code);

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    console.error("[native-google] session restore failed:", error?.code, error?.message);
    throw new Error(
      `Google sign-in could not be completed (${error?.code ?? error?.message ?? "no session"}). Please try again.`,
    );
  }
  return true;
}
