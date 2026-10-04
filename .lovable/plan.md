# Ghar Kharcha — Android Google login + auth hardening

Your file asks for a lot. This plan does the most important part first: **Google login inside the Android app**. Most other items (data isolation, offline message, signed builds) were already done in earlier rounds.

## Phase 1 — Google login inside the Android app (main fix)

How it will work for the user:
1. In the app, tap "Continue with Google".
2. A secure Chrome sheet slides up over the app. This is not a separate browser window, and Google allows sign-in there.
3. Pick the Google account.
4. The sheet closes by itself and the app opens the dashboard, already logged in.

Why this approach: Google blocks sign-in inside app windows. Signing in directly through the phone's Google system needs your own Google Cloud setup, and the Lovable-managed Google login does not support it. A secure Chrome sheet plus an automatic return to the app works with the current setup. You don't need a Google Cloud Console account.

Safety:
- The app only gets a **one-time, 2-minute code**, never the login keys themselves.
- The code only works together with a secret that stays inside the app. Another app that grabs the code can't use it.
- The code is deleted after one use.

After this, the "Google login abhi Android app me kaam nahi karta" message is removed. If something fails (you cancel, no internet, the code expires), a clear Hindi/English message shows. The screen never goes blank.

## Phase 2 — New signed APK
- Version 1.0.3 (code 4), signed with the same permanent key, so it updates without uninstalling.
- Run the build and give you the real download link.

## Phase 3 — Email signup with 6-digit OTP
- Signup asks for: full name, email, password, confirm password. Then it shows a "Enter 6-digit code" screen with resend (60-second timer) and change email.
- Unverified accounts cannot log in or read any data.
- Temporary/fake email domains are blocked. Gmail, Outlook, Yahoo, iCloud and Proton are allowed.
- Password: minimum 8 characters, strength meter, show/hide button, leaked-password check.
- Forgot password uses a code too.

## Phase 4 — Error safety
- An error screen in Hindi/English instead of a blank screen.
- Errors are saved so the admin page can see them.
- Settings shows the app version and whether you're on Android or web.

## What I can't do or verify from here
- Install on your phone and tap the buttons. You'll do the final check, and I'll give simple steps.
- Email codes use the built-in email sender. A custom sending domain is optional and only needed later.

## Technical details
- Packages: add `@capacitor/browser`, and keep `@capacitor/app` for the `appUrlOpen` deep link.
- Custom URL scheme `com.gharkharcha.manager://auth-callback`. The intent filter is added in `scripts/android-postprocess.py`.
- Flow:
  1. The app makes a random `verifier` and calls the browser with `/auth/native?challenge=sha256(verifier)`.
  2. The page runs `lovable.auth.signInWithOAuth` (full-page, in Chrome).
  3. On return, a server fn stores `{challenge, refresh_token}` in a `native_auth_handoff` table (service role only, 2-min TTL), then redirects to `com.gharkharcha.manager://auth-callback?code=ID`.
  4. The app calls the server fn `redeem(code, verifier)`, which checks the hash, deletes the row and returns the session.
  5. The app calls `supabase.auth.setSession`.
- The Chrome-side web session is signed out after the handoff.
- OTP uses the built-in email OTP (`verifyOtp` type `signup`/`recovery`) with email confirmation on. The disposable-domain check runs in a server fn before signup.
- Add an `error_logs` table: insert for authenticated + anon with limited columns, select for admin only via `has_role`.
- Workflow: bump `VERSION_NAME` / `VERSION_CODE`.
