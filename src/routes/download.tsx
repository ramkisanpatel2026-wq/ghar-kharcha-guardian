import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  APP_VERSION,
  APP_VERSION_CODE,
  GITHUB_REPO,
  fetchLatestRelease,
} from "@/lib/release";
import { LangToggle } from "@/components/LangToggle";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Ghar Kharcha APK — Android App" },
      {
        name: "description",
        content:
          "Download the latest Ghar Kharcha Android APK. Track family salary, expenses, savings and udhari securely in Hindi or English.",
      },
      { property: "og:title", content: "Download Ghar Kharcha APK — Android App" },
      {
        property: "og:description",
        content:
          "Get the latest Ghar Kharcha Android build, with installation steps and release information.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ghar-kharcha-guardian.lovable.app/download" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Download Ghar Kharcha APK" },
      {
        name: "twitter:description",
        content: "Latest Ghar Kharcha Android APK, installation guide and release notes.",
      },
    ],
    links: [{ rel: "canonical", href: "https://ghar-kharcha-guardian.lovable.app/download" }],
  }),
  component: DownloadPage,
});

const FEATURES: [string, string][] = [
  ["Salary & income", "Ek hi entry per month — automatically balance me add hoti hai."],
  ["Expenses", "Ration, petrol, bijli, school fees — category-wise tracking."],
  ["Savings", "Bank, gold aur FD savings ka monthly record."],
  ["Udhari", "Diya hua aur liya hua paisa, due date ke saath."],
  ["Monthly PDF bill", "Har mahine ka printable report — WhatsApp par share karein."],
  ["हिंदी + English", "Poori app ek tap me language switch karti hai."],
];

function DownloadPage() {
  const {
    data: release,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["latest-release", GITHUB_REPO],
    queryFn: fetchLatestRelease,
    enabled: Boolean(GITHUB_REPO),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const version = release?.version ?? APP_VERSION;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="Ghar Kharcha logo" className="h-9 w-9 rounded-xl" width={36} height={36} />
          <span className="text-lg font-semibold">Ghar Kharcha</span>
        </Link>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link
            to="/auth"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/10"
          >
            Open web app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="rounded-3xl bg-card p-6 shadow-hero sm:p-10">
          <img
            src="/icon-512.png"
            alt="Ghar Kharcha app icon"
            className="h-20 w-20 rounded-3xl shadow-card"
            width={80}
            height={80}
          />
          <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            Ghar Kharcha for Android
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Har mahine ka ghar ka kharcha, salary, savings aur udhari — ek secure app me. Aapka
            data sirf aapke account me dikhta hai, aur har record aapke login se juda hota hai.
          </p>

          <div className="mt-7">
            {!GITHUB_REPO ? (
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-semibold">APK release channel not connected yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The Android build workflow is ready, but this site does not know which GitHub
                  repository publishes the releases. Set <code>VITE_GITHUB_REPO</code> to your{" "}
                  <code>owner/repo</code> and the latest APK link appears here automatically. Until
                  then, no download button is shown — we never link to a file that does not exist.
                </p>
              </div>
            ) : isPending ? (
              <div className="h-14 w-full max-w-sm animate-pulse rounded-xl bg-muted" />
            ) : release ? (
              <>
                <a
                  href={release.apkUrl}
                  className="inline-flex items-center justify-center rounded-xl gradient-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-hero hover:opacity-95"
                >
                  Download Latest Ghar Kharcha APK
                </a>
                <p className="mt-3 text-sm text-muted-foreground">
                  Version {release.version}
                  {release.apkSizeMb ? ` · ${release.apkSizeMb} MB` : ""}
                  {release.publishedAt
                    ? ` · released ${new Date(release.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
                <a
                  href={release.htmlUrl}
                  className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View all releases
                </a>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-semibold">
                  {isError ? "Could not reach the release server" : "No published APK yet"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Run the <strong>Android Build (APK)</strong> workflow in the connected GitHub
                  repository. The first successful release build publishes the APK here
                  automatically.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">What Ghar Kharcha does</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-xl font-semibold">Install instructions</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Tap the download button above and wait for the APK to finish downloading.</li>
              <li>Open the file from your notification shade or the Downloads folder.</li>
              <li>
                Android will ask to allow installs from this source — enable it once, then tap{" "}
                <strong>Install</strong>.
              </li>
              <li>Open Ghar Kharcha and sign in with email/password or Google.</li>
              <li>
                Updating later? Just install the newer APK over the old one — your data stays in
                your account, not on the phone.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-xl font-semibold">Security & your data</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every record is stored against your authenticated user account and protected by
              row-level security rules in the database, so no other user can read or change your
              salary, expenses, savings or udhari. The app talks to the backend over HTTPS only,
              and no secret keys are shipped inside the app.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Prefer not to install anything? The same app runs in your browser and can be added to
              your home screen from the browser menu.
            </p>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl font-semibold">Release information</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Current version</dt>
              <dd className="font-medium">{version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version code</dt>
              <dd className="font-medium">{APP_VERSION_CODE}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Package</dt>
              <dd className="font-medium">com.gharkharcha.app</dd>
            </div>
          </dl>
          {release?.notes ? (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-background p-4 text-sm text-muted-foreground">
              {release.notes}
            </pre>
          ) : null}
        </section>

        <section className="mt-14 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl font-semibold">Support</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            App nahi khul rahi, login fail ho raha hai, ya data dikh nahi raha? Pehle app band karke
            dubara kholiye aur internet check kijiye. Phir bhi problem ho to{" "}
            <a className="font-medium text-primary hover:underline" href="mailto:ramkisanpatel2026@gmail.com">
              ramkisanpatel2026@gmail.com
            </a>{" "}
            par likhiye — apna registered email aur screenshot bhejiye.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Ghar Kharcha · v{version} ·{" "}
        <Link to="/" className="text-primary hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
