/**
 * Android in-app Google login: Chrome Custom Tab + one-time code (PKCE-style).
 * Browser-only; call from event handlers / effects.
 */
import { supabase } from "@/integrations/supabase/client";
import { redeemNativeHandoff } from "./native-auth.functions";

const SITE = "https://ghar-kharcha-guardian.lovable.app";
const KEY = "gk_native_verifier";

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function startNativeGoogle() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(KEY, verifier);
  const challenge = b64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: `${SITE}/auth/native?challenge=${challenge}`, toolbarColor: "#0F5132" });
}

/** Handles com.gharkharcha.manager://auth-callback?code=... */
export async function handleNativeCallback(url: string): Promise<void> {
  if (!url.startsWith("com.gharkharcha.manager://auth-callback")) return;
  const { Browser } = await import("@capacitor/browser");
  void Browser.close().catch(() => {});
  const params = new URL(url.replace("com.gharkharcha.manager://", "https://x/")).searchParams;
  const err = params.get("error");
  if (err) throw new Error(err);
  const code = params.get("code");
  const verifier = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  if (!code || !verifier) throw new Error("Google login was interrupted. Please try again.");
  const { refreshToken } = await redeemNativeHandoff({ data: { code, verifier } });
  const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) throw new Error("Could not finish Google login. Please try again.");
}
