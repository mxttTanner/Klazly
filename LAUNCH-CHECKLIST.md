# Klazly — Go-Live Launch Checklist

**Goal:** the single, tracked path from "feature-complete" to "ready for paying
customers." Derived from a full codebase readiness assessment + the existing
`KLAZLY-PITCH-AUDIT.md`. Billing model is **manual via Zalo** (bank transfer /
Momo / ZaloPay) — no automated card gateway — by product decision.

Legend: ☑ done · ☐ open · 🔧 code (we can do it) · 👤 owner-only (prod DB / live
test / external deck) · 💬 decision needed

---

## Tier 1 — Blocking paying customers

| # | Item | Type | Status | Notes |
|---|------|------|--------|-------|
| 1 | **Worksheet storage cross-tenant leak** — files were world-readable by URL | 🔧 | ☑ | Fixed: bucket is now private, served via short-lived signed URLs. See `db/worksheets.sql`, `src/lib/worksheets.ts`. Re-run `db/worksheets.sql` against prod to flip the live bucket private. |
| 2 | **Founding cap shows 3, pitch says 5** | 👤 | ☐ | Code default is already `FOUNDING_DEFAULT_CAP = 5`; the **prod DB** `app_settings.founding_center_cap` is set to 3. Fix in `/super-admin` Founding widget, or `update public.app_settings set value=to_jsonb(5) where key='founding_center_cap';` |
| 3 | **Demo depends on prod seed data** — `/demo` errors if not seeded | 👤 | ☐ | Run `npm run db:seed` against prod, then open `klazly.com/demo` as admin/teacher/parent and confirm rich data loads. (Seed now also uploads real worksheet files so attachment links work — see #1.) |
| 4 | **Verify cross-center RLS on the live DB** | 👤 | ☐ | Automated test now exists (`tests/rls.test.ts`). Run it against prod/staging by setting the three Supabase env vars, or `npm test`. |
| 5 | **"Daily backups" claim** | 👤 | ☐ | True only if the Supabase plan tier includes daily backups. Confirm the plan, or drop the claim from the pitch. |

## Tier 2 — Strongly recommended before scaling

| # | Item | Type | Status | Notes |
|---|------|------|--------|-------|
| 6 | **CI pipeline** (lint + typecheck + test + build on every PR) | 🔧 | ☑ | Added `.github/workflows/ci.yml`. Build runs the existing prebuild guards. |
| 7 | **Automated tests** (unit + cross-center RLS) | 🔧 | ☑ | Added vitest: 25 unit tests for the subscription state machine + phone normalization, plus a self-skipping RLS isolation suite. `npm test`. |
| 8 | **Stale SALES.md** contradicted live pricing/copy | 🔧 | ☑ | Reconciled to live pricing (1.2M/mo · 5.4M/6mo · 9.9M/yr), Founding-5 + 30-day double trial, phone login, 4-level rating, report buttons, manual payment. |
| 9 | **Phone-only parents can't reset passwords** (no SMS OTP) | 💬 | ☐ | Today admins reset manually. Decide: wire an SMS/OTP provider, or document the manual-reset policy and ensure the pitch doesn't imply self-serve reset. `src/app/forgot-password/forgot-password-form.tsx`. |
| 10 | **Email delivery fails silently** without `RESEND_API_KEY` | 🔧 | ☐ | Sends are skipped + logged once, never surfaced. Surface a non-blocking warning when notifications can't be sent. `src/lib/email.ts`. |
| 11 | **Deployment docs** | 🔧 | ☐ | README covers local dev only. Add Vercel env-var setup + "run `db/schema.sql`, `db/storage.sql`, `db/worksheets.sql`" ordering. |
| 12 | **Payment methods claimed vs accepted** | 👤 | ☐ | FAQ lists bank transfer / Momo / ZaloPay / VNPay. Confirm you can actually receive each, or trim the FAQ. |

## Tier 3 — Polish / nice-to-have

| # | Item | Type | Status | Notes |
|---|------|------|--------|-------|
| 13 | **PDF report filename + size** ("BaoCao-…-Thang5.pdf") | 💬 | ☐ | Currently `window.print()` → browser names it "students". Set `document.title` before print, or generate a server-side PDF. |
| 14 | **EN locale strictness** (dots vs commas, DD/MM vs MM/DD) | 💬 | ☐ | VI default is correct. Decide whether EN follows VI conventions or English ones. |
| 15 | **Landing mockups hardcoded Vietnamese** under EN toggle | 💬 | ☐ | Route mockup strings through `t()`, or accept as static screenshots. |
| 16 | **Teacher logging target/denominator** ("6/24") | 💬 | ☐ | Raw counts today; add a weekly target, or adjust the pitch screenshot. |
| 17 | **Intra-center contact privacy** | 🔧 | ☐ | Any same-center user can read all users' email + phone. Expose only `id, full_name, role` to non-admins via a view. `db/schema.sql:210`. |
| 18 | **In-app onboarding wording** ("Bắt đầu trong 30 phút") | 💬 | ☐ | Defensible under manual onboarding (account in ~5 min + setup ~25 min), but review that landing copy doesn't imply self-signup. |
| 19 | **User-guide link** points at `#features`, no real guide | 🔧 | ☐ | Build a short guide page or relabel the link. |

---

## Done in the current branch

- **Worksheet storage isolation** — private bucket + signed URLs (Tier 1 #1).
- **CI workflow** — lint, typecheck, test, build (Tier 2 #6).
- **Test suite** — 25 unit tests + RLS isolation integration test (Tier 2 #7).
- **SALES.md reconciliation** — matches the live product (Tier 2 #8).

## How to verify locally

```bash
npm install
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest (RLS suite runs only if .env.local has Supabase keys)
npm run build       # next build + prebuild copy guards
```
