import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Step 3: signed-in Chrome page parks the session behind a one-time code. */
export const createNativeHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        refreshToken: z.string().min(8).max(512),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // clean up stale codes
    await supabaseAdmin
      .from("native_auth_handoff")
      .delete()
      .lt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
    const { data: row, error } = await supabaseAdmin
      .from("native_auth_handoff")
      .insert({ challenge: data.challenge, refresh_token: data.refreshToken })
      .select("id")
      .single();
    if (error) throw new Error("Could not start app login");
    return { code: row.id };
  });

async function sha256url(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Step 4: the app proves it owns the secret and gets the session once. */
export const redeemNativeHandoff = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ code: z.string().uuid(), verifier: z.string().min(43).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("native_auth_handoff")
      .delete()
      .eq("id", data.code)
      .select("challenge, refresh_token, created_at")
      .maybeSingle();
    if (!row) throw new Error("Login code expired. Please try Google login again.");
    if (Date.now() - new Date(row.created_at).getTime() > 2 * 60_000)
      throw new Error("Login code expired. Please try Google login again.");
    if ((await sha256url(data.verifier)) !== row.challenge)
      throw new Error("Login check failed. Please try again.");
    return { refreshToken: row.refresh_token };
  });
