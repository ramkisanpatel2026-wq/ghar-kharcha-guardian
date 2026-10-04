import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { createNativeHandoff } from "@/lib/native-auth.functions";

export const Route = createFileRoute("/auth/native")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Google login for app — Ghar Kharcha Manager" },
      { name: "description", content: "Secure Google sign-in for the Ghar Kharcha Android app." },
      { property: "og:title", content: "Google login for app — Ghar Kharcha Manager" },
      { property: "og:description", content: "Secure Google sign-in for the Ghar Kharcha Android app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NativeAuth,
});

const APP = "com.gharkharcha.manager://auth-callback";
const CH = "gk_native_challenge";

function NativeAuth() {
  const [msg, setMsg] = useState("Google login khul raha hai…");
  const [back, setBack] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      const q = new URLSearchParams(window.location.search).get("challenge");
      if (q) sessionStorage.setItem(CH, q);
      const challenge = q ?? sessionStorage.getItem(CH);
      const fail = (e: string) => {
        const u = `${APP}?error=${encodeURIComponent(e)}`;
        setMsg(e);
        setBack(u);
        window.location.href = u;
      };
      if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge))
        return fail("Login link galat hai. App me dobara try karein.");

      const { data } = await supabase.auth.getSession();
      if (!data.session || q) {
        // fresh start: always ask Google so the right account is chosen
        if (data.session) await supabase.auth.signOut({ scope: "local" });
        const r = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth/native`,
          extraParams: { prompt: "select_account" },
        });
        if (r.error) return fail(r.error.message ?? "Google login cancel ho gaya.");
        if (r.redirected) return;
      }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return fail("Google login poora nahi hua. Dobara try karein.");
      try {
        const { code } = await createNativeHandoff({
          data: { challenge, refreshToken: s.session.refresh_token },
        });
        sessionStorage.removeItem(CH);
        await supabase.auth.signOut({ scope: "local" }); // keep app session valid
        const u = `${APP}?code=${code}`;
        setMsg("Login ho gaya! App khul raha hai…");
        setBack(u);
        window.location.href = u;
      } catch {
        fail("Internet ya server problem. Dobara try karein.");
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <img src="/icon-512.png" alt="" className="mx-auto h-14 w-14 rounded-xl" width={56} height={56} />
        <p className="mt-4 text-base font-medium">{msg}</p>
        {back && (
          <a href={back} className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            App par wapas jayein
          </a>
        )}
      </div>
    </div>
  );
}
