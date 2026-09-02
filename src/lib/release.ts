/**
 * Ghar Kharcha release metadata.
 *
 * APP_VERSION must stay in sync with the versionName in
 * .github/workflows/android-build.yml so the website, the APK and the
 * release notes always describe the same build.
 *
 * GITHUB_REPO is the "owner/repo" of the GitHub repository connected to this
 * Lovable project. The Android build workflow publishes every successful
 * release build to that repository's GitHub Releases, and the download page
 * resolves the latest APK from it at runtime.
 */
export const APP_VERSION = "1.0.0";
export const APP_VERSION_CODE = 1;

export const GITHUB_REPO: string =
  (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim() ||
  "ramkisanpatel2026-wq/ghar-kharcha-guardian";

export type LatestRelease = {
  version: string;
  publishedAt: string | null;
  notes: string;
  apkUrl: string;
  apkSizeMb: number | null;
  htmlUrl: string;
};

/** Resolves the latest published APK straight from GitHub Releases. */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  if (!GITHUB_REPO) return null;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    tag_name?: string;
    name?: string;
    body?: string;
    published_at?: string;
    html_url?: string;
    assets?: { name: string; browser_download_url: string; size: number }[];
  };
  const apk = (data.assets ?? []).find((a) => a.name.toLowerCase().endsWith(".apk"));
  if (!apk) return null;
  return {
    version: (data.tag_name ?? data.name ?? APP_VERSION).replace(/^v/, ""),
    publishedAt: data.published_at ?? null,
    notes: data.body ?? "",
    apkUrl: apk.browser_download_url,
    apkSizeMb: apk.size ? Math.round((apk.size / (1024 * 1024)) * 10) / 10 : null,
    htmlUrl: data.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`,
  };
}
