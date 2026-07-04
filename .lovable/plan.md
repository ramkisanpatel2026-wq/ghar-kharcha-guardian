# Ghar Kharcha AI — Phased Build Plan

Backend stays on Lovable Cloud (Supabase + TanStack Start server functions). No Firebase, no Razorpay, no AdMob — those aren't part of this stack and add real risk. I'll ship four phases; you approve each before I start the next.

## Phase 1 — AI Assistant + Voice Expense (this turn)

**AI Financial Assistant** at `/assistant`
- Chat UI (AI Elements: Conversation, Message, PromptInput, Shimmer)
- Server route `src/routes/api/chat.ts` streams from Lovable AI (`google/gemini-3-flash-preview`)
- Pulls current-month expenses, salary, udhari, category totals as system context so answers are grounded in the user's actual data
- Suggests savings, flags overspend categories, answers questions in Hindi/English/Hinglish
- Bottom-nav entry added

**Voice Expense Entry** on `/expenses`
- Mic button records with Web Audio → WAV
- Server fn `transcribeAndParse`: STT via `openai/gpt-4o-mini-transcribe`, then structured extract (amount, category, note, date) via Gemini
- Pre-fills the add-expense form; user confirms + saves
- Handles Hindi/English/Hinglish ("500 ka petrol", "grocery 1200")

## Phase 2 — Savings Goals + Udhari Upgrades

- New `savings_goals` table (title, target, saved, deadline, icon) with RLS + GRANTs
- Goals page with progress bars, contribute action, completion animation
- Udhari: partial payments log (`udhari_payments` table), payment history view, running balance

## Phase 3 — Reports & Exports (PDF/Excel)

- Monthly PDF summary via `jspdf` + `jspdf-autotable` (already installed): totals, category pie, transactions table
- Excel export via `xlsx`
- Share/download from Reports page

## Phase 4 — PWA Polish + Dark Mode + App Lock PIN

- Dark/light/system theme toggle in Settings, persisted per profile
- Installable PWA polish (manifest already exists, verify icons + install prompt)
- App Lock: 4–6 digit PIN, hashed with WebCrypto, stored in `profiles.pin_hash`; prompt on app open when set

## Explicitly Out of Scope

- Firebase migration, Razorpay, AdMob, Play Store APK build (Lovable ships PWA/web, not native Android)
- Multi-family shared accounts (you said not now)
- Bill scanner OCR (can add later as a Phase 5 if desired)
- Admin analytics revamp (basic admin page already exists)

## Approval

Reply "go" and I start Phase 1. After Phase 1 ships and you've tested it, say "phase 2" and I continue.
