# Ghar Kharcha finance-platform upgrade

## Audit summary

- **Current architecture:** Existing TanStack Start v1 / React 19 web app with a PWA and Capacitor Android shell. Lovable Cloud supplies authentication, Postgres data, row-level access policies, and storage. The current app uses these existing systems; this plan does not replace them.
- **Already implemented in the project:** Email/password and Google sign-in flows; profile and category management; monthly salary, expenses, savings, and udhari; reminders; monthly dashboard and category chart; printable PDF and WhatsApp sharing; bilingual UI; voice-assisted expense form; a data-aware AI adviser; and a role-gated admin page.
- **Audit findings to address:** Category budgets are monthly only. The AI adviser answers questions but does not safely propose-and-confirm expense creation. Receipt OCR, family groups, repayment history, savings goals, investments, subscriptions, wallets/transfers, notification preferences, offline transaction synchronization, and verified premium billing are not implemented. Recent preview telemetry showed zero-sized dashboard charts. The dashboard and report currently subtract savings from balance, which conflicts with the established rule **Balance = Income − Expenses**. Source inspection cannot verify real Google sign-in, email delivery, notification delivery, payment settlement, or release-APK behavior.
- **Data safety:** Preserve current tables and records. Any new schema will be additive, use explicit grants and owner-scoped row policies, and avoid broadening access. Never invent market prices or payment status. External-service configuration must be verified before calling a feature production-ready.

## Phased implementation

1. **Reliability and financial correctness:** fix balance consistency, repair chart sizing, improve visible loading/error states where needed, and add focused calculation/validation tests. Keep existing sign-in and stored records unchanged.
2. **AI and receipts:** make natural-language expense entry a review-and-confirm action; add image/PDF receipt intake, extraction suggestions, duplicate warnings, and private receipt storage. Never save uncertain extracted values without confirmation.
3. **Household finance records:** add permissioned family groups, partial repayment history, savings goals, recurring payments, accounts/transfers, and manual asset/liability tracking. Use additive migrations, RLS, and tests for ownership and calculations.
4. **Planning and continuity:** extend budgets by period, add threshold alerts and month comparisons, explain an educational health score, broaden reports/exports, add notification controls, and implement offline pending-entry sync with duplicate protection.
5. **Paid and admin operations:** integrate verified subscription status and billing history through the existing payments path, then extend authorized admin metrics and monitoring without exposing user-level financial details to other users.
6. **Verification and release:** run the project build/typecheck and phase-specific tests, exercise key screens at mobile and desktop sizes, inspect database policies and data reads, and list anything requiring owner credentials or hosted configuration. Publishing and physical-device/payment-provider testing are reported only when actually completed.

## Technical approach

- Preserve TanStack Start, React, the existing Supabase client/auth integration, current PWA/Capacitor setup, and existing routes.
- Use the project’s Lovable Cloud migration workflow for schema changes; every new public table gets matching grants, RLS, and explicit owner/member policies.
- Keep AI and privileged logic server-side. Use existing AI configuration for suggestions, and require user confirmation before inserts or other financial actions.
- Treat premium access, admin privileges, file access, and family membership as server/database-verified—not client flags.
- Implement incrementally and verify each phase before starting dependent work. Do not claim every proposed module is complete in a single phase.