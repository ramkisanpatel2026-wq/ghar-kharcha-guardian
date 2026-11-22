# Roadmap
- [x] Phase 1: Android in-app Google login (Chrome sheet + one-time code)
- [ ] Phase 2: confirm APK v1.0.3 build + share link (build starts after code sync)
- [x] Phase 3: email signup OTP flow, disposable-email block, password rules
- [ ] Phase 4: error screen, error_logs table, version on Settings
- [ ] Set the Confirm signup email template to include `{{ .Token }}` so it sends a numeric code; this hosted template cannot be changed by app code here.

## Ghar Kharcha finance-platform upgrade
- [ ] Phase A: harden calculations, dashboard charts, auth/data access, and tests without changing existing records.
- [ ] Phase B: add confirmed AI expense entry and secure receipt scanning/storage.
- [ ] Phase C: add family sharing, repayment history, savings goals, recurring payments, accounts/wallets, and manual asset tracking with owner-scoped access.
- [ ] Phase D: add budget periods/alerts, financial health explanations, richer exports, notification preferences, and safe offline synchronization.
- [ ] Phase E: add verified premium billing and expand admin monitoring; use the existing authorized admin role.
- [ ] Verify each phase in preview and run its focused tests before proceeding; only report production status after hosted integrations are verified.
