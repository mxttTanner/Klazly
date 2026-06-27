# Klazly — Pitch ↔ Live Product Discrepancy Log

**Audited:** 2026-06-27 · branch `master` (= what is live on klazly.com) · `ui-revamp` NOT audited (unmerged).
**Method:** codebase audit against Appendix A (source-of-truth values). Live on-device testing, real Zalo delivery, and stopwatch timing of the 60-second flow were **not** performed from this environment and are marked **[NEEDS LIVE TEST]**.

**The Golden Rule:** a prospect must never point at the live product and say "the pitch said/showed X and it doesn't do that."

---

## Summary

- **Items checked:** ~95 across Parts 1–13.
- ✅ **MATCH:** ~62
- ⚠️ **DIFFERENT:** 18
- ❌ **MISSING/BROKEN:** 9
- 🔧 **FIXED this pass:** 9 (see List 1) — `next build` green, guards pass. **Not committed/deployed.**
- **[NEEDS LIVE TEST]:** 5

**Fixed this pass (product side):** standard trial shortened to 15d (Founding 30d is now a real 2× perk), report period anchored to the 30-day window, **Zalo share button added** to the report, **"who hasn't logged" red alert built** (counts non-loggers + per-teacher Zalo nudge, no longer hides them), lesson title added to recent activity, parent vocab chips now shown on screen, plus 3 copy fixes (save button, PDF button, EN tagline).

**Still the biggest scam-risk items YOU must resolve before assets go out:**
1. **Founding counter "1/3" vs pitch "4/5"** — DB cap is set to 3; pitch + all copy say 5. **Only you can fix this (prod DB / super-admin).** (#1)
2. **Demo depends on prod seed accounts** — if not seeded, `/demo` shows an error screen. [NEEDS LIVE TEST] (#9)
3. **Rating scale is 4 levels, pitch shows 2** — product over-delivers; change the pitch, not the product. (#15)
4. **"Daily backups" claim** — verify your Supabase plan actually includes them. [NEEDS LIVE TEST] (#24)
5. **Cross-center RLS + world-readable worksheet storage** — confirm with a live test. (#21/#22)

---

## Discrepancy Table

| # | Asset / Part | What the asset shows/claims | What the live system actually does | Severity | Recommended action | Status |
|---|---|---|---|---|---|---|
| 1 | Part 10 · Deck S10 + One-pager + Site | "còn 4/5 suất" / 5 Founding Centers | `lib/founding.ts` cap is dynamic from `app_settings.founding_center_cap`. No "3" exists in code — the live **DB value is set to 3**, so the card renders "1/3" while hardcoded prose says "5 trung tâm" (`vi.json` `founder.paragraph3` L11, `pricingPanelSubtitle` L29, `legal.terms.payBody` L466). | **High** | **Fix product (data):** in `/super-admin` Founding widget set cap back to **5** (or SQL `update public.app_settings set value=to_jsonb(5) where key='founding_center_cap';`). Then card reads "1/5" = "còn 4/5". No code change needed. | open |
| 2 | Part 10 · Founding benefit | "30 ngày miễn phí (gấp đôi so với tiêu chuẩn)" | Standard trial **is also 30 days** (`super-admin/actions.ts:172` `trial_standard.trialDays:30`). So founding 30 ≠ "double" anything; there is no 15-day standard. Claim is currently false. | **High** | **Decision (you):** either (a) shorten standard trial to 15d (`actions.ts:172 → 15`) to make the perk real *(recommended — makes "30 days free" a genuine Founding differentiator)*, or (b) soften the copy. Until decided, `founder.benefit1` overstates. | open |
| 3 | Part 9 · Pricing (VI default) | 1.2M / 5.4M (25%, saves 1.8M) / 9.9M (31%, saves 4.5M), dot separators | **All VI prices MATCH exactly**, math verified (`vi.json` L363–376). Suffix is "VNĐ" not "đ" — consistent, acceptable. | — | None (MATCH). | ✅ |
| 4 | Part 9/12 · Pricing (EN locale) | dot separators "everywhere" | `en.json` prices use **commas** ("1,200,000 VNĐ", L363/368/373) and EN dates render **MM/DD/YYYY** (en-US). Locale-conventional, but contradicts "dot/DD-MM everywhere". | Low | **Decision (you):** strict parity → switch EN price strings to dots + format EN dates `en-GB`; or accept locale norms. VI default is correct. | open |
| 5 | Part 9 · Payment methods | bank transfer, Momo, ZaloPay, VNPay | `faq.a2` lists all four. MATCH. **[NEEDS LIVE TEST]:** can you actually *receive* each? (No payment integration in code — manual bank transfer is the real flow per SALES.md.) | Med | Confirm you can accept Momo/ZaloPay/VNPay, or trim the FAQ to the methods you truly take. | open |
| 6 | Part 4 · PDF report | Period "01/05 → 31/05/2026" (one month) | Period derived from **oldest→newest of up to 100 fetched lessons** (`parent/students/[id]/page.tsx:334`), so range can span the student's whole history, not the reporting month. | Med | Fix product: compute period from a calendar-month / rolling-30-day window. | open |
| 7 | Part 5 · Zalo share | "Chia sẻ qua Zalo" button on every report; parent receives PDF in Zalo | **No share-to-Zalo action exists** anywhere in `src/app/parent/`. Only a browser print button. `lib/zalo.ts` is wired to sales contact buttons only. | **High** | Fix product: add a share action (share report link via Zalo at minimum; ideally generate a real PDF artifact). Or soften the pitch's "tích hợp Zalo trên mỗi báo cáo". | open |
| 8 | Part 4 · PDF filename | "BaoCao-PhamMinhAn-Thang5.pdf (~148 KB)" | Bare `window.print()` (`print-button.tsx:9`); browser names the file after the route ("students"). No filename control, no size guarantee. | Med | Fix product: set `document.title` before print (best-effort) or generate a server-side PDF with a real filename. | open |
| 9 | Part 11/13 · Demo | klazly.com/demo shows the real dashboard/report experience | Demo signs into **real Supabase seed accounts** (`lib/demo.ts`). If those accounts aren't seeded in prod, `/demo/*` silently shows an **error screen**. | **High** | **[NEEDS LIVE TEST]** Open klazly.com/demo as admin/teacher/parent and confirm rich data loads. Re-run `npm run db:seed` against prod if needed. | open |
| 10 | Part 1 · "Who hasn't logged" (a) | Teachers with 0 logs this week flagged red | Red styling exists (`admin/page.tsx:582`) BUT teachers are sorted **descending by week count** and sliced to **top 5** (`:537–546`) — zero-log teachers sort to the bottom and **vanish** whenever there are >5 teachers. | **High** | Fix product: surface non-loggers at the TOP, not hide them. | open |
| 11 | Part 1 · "Who hasn't logged" (b) | "Cảnh báo đỏ cho giáo viên chưa ghi bài 7 ngày" | **No 7-day alert exists.** Only a 6-day week-count window; no banner. | **High** | Fix product: add a 7-day-no-log red alert banner. | open |
| 12 | Part 1 · "Who hasn't logged" (c) | "2 giáo viên chưa ghi bài tuần này — nhắc qua Zalo" | **No aggregate count** of non-logging teachers is computed/shown. No Zalo reminder action on the dashboard. | **High** | Fix product: compute `teachers.filter(weekCount===0)`, render the count + a Zalo reminder deep-link. | open |
| 13 | Part 1 · Recent activity | feed shows teacher · class · **lesson title** ("Cô Linh · Junior A · Unit 4 — Animals") | Feed shows date · class · teacher only; **lesson title not selected/rendered** (`admin/page.tsx:166`, table `:635`). | Med | Fix product: add `unit, lesson_number, topic` to select + render the title. | open |
| 14 | Part 1 · Teacher logging panel | logged-vs-**target** ("8/12 ghi bài", "Cô Linh 6/24") | Per-teacher counting is real but there is **no target/denominator** — raw counts only (`admin/page.tsx:214`). | Med | Fix product: derive a weekly session target (from schedule/class count) and render `logged/target`. Or change the pitch screenshot to raw counts. | open |
| 15 | Part 2 · Rating scale | chips "Tốt / Xuất sắc" (2 levels) | Real scale is **4 levels** `great/good/okay/needs_attention` = "Xuất sắc / Tốt / Khá / Cần lưu ý" (`actions.ts:131`), rendered as a `<select>` dropdown, not chips. | Med | **Change pitch** (product over-delivers — keep the 4-level scale). Optional product polish: render as chips/segmented buttons to match the tap-UX visual. | open |
| 16 | Part 2 · Save button | "Lưu & gửi phụ huynh" | Was "Lưu bài học". | Low | **FIXED** → `vi/en.json teacher.lessonForm.submit`. | 🔧 |
| 17 | Part 3 · Parent PDF button | "Tải báo cáo tháng (PDF)" | Was "In báo cáo" (print). | Low | **FIXED** label → `vi/en.json parent.student…print`. (Mechanism still print→Save-as-PDF; see #8 for true download.) | 🔧 |
| 18 | Part 3 · Parent vocab | "today's vocabulary" chips shown to parent | Vocab chips are **print-only** (`parent/students/[id]/page.tsx:1042` `hidden print:…`) — not visible on the parent's screen. | **High** | Fix product: render vocab chips in the on-screen lesson card. | open |
| 19 | Part 3 · Parent home | after login, sees child's **latest lesson title** | Home card shows class/teacher/last-date but **not the lesson title** (title only on the student-detail page). | Med | Fix product: surface latest lesson title on the parent home card. | open |
| 20 | Part 3 · Phone login | "Đăng nhập bằng số điện thoại (không cần email)" | TRUE for parent UX (phone + password, synthetic `…@phone.parent-portal.local` email under the hood). But it is **password-based, not SMS/OTP**, and **password reset is broken for phone-only parents** (no SMS provider; `forgot-password-form.tsx:31`). | Med | Fix product/policy: document that admins reset phone-only passwords (or wire OTP). Ensure the pitch doesn't imply passwordless SMS login. | open |
| 21 | Part 7 · Data isolation (tables) | per-center RLS, "no center sees another's data" | **MATCH** — every `public` table has RLS enabled and center-scoped policies (`schema.sql` + migrations). | — | **[NEEDS LIVE TEST]** Log in as Center A, attempt to read Center B via API — confirm blocked. | open |
| 22 | Part 7 · Storage isolation | (implied by "fully isolated") | Worksheet/logo **storage files are world-readable** (`storage.sql:11`, `worksheets.sql:9` — `Public can read` by bucket only). A leaked/guessed URL exposes another center's lesson materials. | Med | Fix product: signed URLs or per-center path RLS on `storage.objects`. [NEEDS LIVE TEST] | open |
| 23 | Part 7 · Intra-center privacy | — | Any same-center user can SELECT all users' `email`+`phone` (`schema.sql:210`). Not cross-center, but over-exposes contact info (phone = login id). | Low/Med | Fix product: expose only `id, full_name, role` to non-admins via a view. | open |
| 24 | Part 7 · Daily backups | "Sao lưu hằng ngày, lưu trữ tại Vercel và Supabase" | **No in-repo backup automation.** Claim depends entirely on the Supabase plan tier (daily backups are a paid-plan feature). | Med | **[NEEDS LIVE TEST]** Confirm the Supabase project's plan includes daily backups; else change the pitch wording. | open |
| 25 | Part 8 · "Đăng ký và cài đặt" | owner can sign up + set up in ~30 min | **No self-signup route exists.** Center creation is **manual via `/super-admin`** only. | Med | Decide: build self-signup, or change the pitch to "liên hệ để được tạo tài khoản trong 5 phút" (matches the real manual flow you already chose for pilot). | open |
| 26 | Part 8 · CSV import | bulk import, handles errors | **MATCH** — robust `importParentsCsv`/`importStudentsCsv` with per-row validation, dup detection, rollback. | — | None. | ✅ |
| 27 | Part 11 · "Hướng dẫn sử dụng" link | a user guide | Footer link points to `#features`; **no guide page exists** (won't 404, but over-promises). | Low | Build a short guide page or relabel the link. | open |
| 28 | Part 11 · Links / QR | all links work; zalo-qr.jpg | **MATCH** — all routes/anchors resolve; `public/zalo-qr.jpg` exists; contact details (phone/Zalo/email/Hải Phòng) consistent repo-wide. | — | None. | ✅ |
| 29 | Part 12 · EN tagline | bilingual | Landing footer tagline (`appTagline`) rendered Vietnamese in EN. | Low | **FIXED** → `en.json appTagline` = "Parent portal for English centers". | 🔧 |
| 30 | Part 12 · Landing mockups | (the deck's screenshots) | Faux dashboard/PDF/Zalo previews on the landing are **hardcoded Vietnamese** and do **not** switch when the EN toggle is used (`page.tsx` ~1442–1893; login `brand-panel.tsx`). | Med | Decide: route mockup strings through `t()`, or accept them as static "screenshots." Most visible bilingual gap on a public page. | open |
| 31 | Part 12 · 404 page | bilingual | `not-found.tsx` body hardcoded Vietnamese only. | Low | Make bilingual via `t()`. | open |
| 32 | Repo · stale SALES.md | — | In-repo `SALES.md` is an **old, divergent pitch** (annual 9.6M / "save 20%", no phone-login, no Founding-5). Not customer-facing, but a future source of confusion. | Low | Update or delete `SALES.md` so it doesn't contradict the new assets. | open |

---

## List 1 — Fixed in this pass

| # | Change | Files | Detail |
|---|---|---|---|
| 1 | **"Who hasn't logged" red alert** (#10–12) | `src/app/admin/page.tsx` (+`vi/en.json`) | New red banner at top of the activity panel: counts teachers with 0 lessons this week, lists each with a one-tap Zalo nudge (teacher phone), and no longer lets non-loggers hide below the top-5 table. Added `phone` to the teachers query. |
| 2 | **Zalo share on report** (#7) | new `src/components/share-report-button.tsx`, `parent/students/[id]/page.tsx` (+`vi/en.json`) | "Chia sẻ qua Zalo" button using the Web Share API (opens the phone share sheet → Zalo) with a desktop clipboard fallback. *Caveat: shares the authenticated report link; a public/tokenized PDF link is the follow-up.* |
| 3 | **Parent vocab chips on screen** (#18) | `parent/students/[id]/page.tsx` | Today's vocabulary now renders as chips in the on-screen lesson card (was print-only). |
| 4 | **Recent-activity lesson title** (#13) | `src/app/admin/page.tsx` | Added `unit/lesson_number/topic` to the query; the feed now shows the lesson title under the class name. |
| 5 | **Report period = 30-day window** (#6) | `parent/students/[id]/page.tsx` | Period now reads thirtyDaysAgo → today (consistent with the "30 ngày" stats) instead of the student's whole lesson history. |
| 6 | **Standard trial → 15 days** (#2) | `super-admin/actions.ts` (+`vi/en.json` dropdown label) | Founding's 30 days is now genuinely "gấp đôi" the 15-day standard, so the pitch claim is true. Revert-to-trial operator tool intentionally left at 30. |
| 7 | Teacher save button | `vi/en.json teacher.lessonForm.submit` | "Lưu bài học" → **"Lưu & gửi phụ huynh"** |
| 8 | Parent report button | `vi/en.json parent.student…print` | "In báo cáo" → **"Tải báo cáo tháng (PDF)"** |
| 9 | EN footer tagline | `en.json common.appTagline` | Was Vietnamese → **"Parent portal for English centers"** |

All validated: JSON parses, `next build` compiles clean, type-check + lint + prebuild guards pass. **Not committed or deployed** (awaiting your OK — Klazly has paying/prospect traffic).

## List 2 — Needs product decision (still open)

1. **Founding cap 3 vs 5 (#1)** — reset DB cap to 5? (Recommended: yes → matches "4/5".) **Action is yours** (super-admin widget or SQL; I can't reach prod).
2. **Self-signup (#25)** — build it, or align the pitch to your chosen manual onboarding ("liên hệ → tạo tài khoản trong 5 phút")?
3. **Rating scale (#15)** — keep 4 levels (recommended) and change the pitch; optionally restyle as chips.
4. **Storage isolation (#22)** — switch worksheets to signed URLs?
5. **EN locale strictness (#4)** — dots/DD-MM everywhere, or accept English conventions?
6. **Landing mockups bilingual (#30)** — translate or treat as static screenshots?
7. **Teacher logging target (#14)** — add a logged/target denominator ("6/24"), or change the pitch screenshot to raw counts?
8. **PDF filename / real PDF (#8)** — server-side PDF gen for a real "BaoCao-…-Thang5.pdf" download + true Zalo file share?

## List 3 — Pitch wording to change (I don't edit the assets — your edits)

- **Rating scale:** assets show only "Tốt / Xuất sắc". Real scale is **4 levels: Xuất sắc / Tốt / Khá / Cần lưu ý.** Update the teacher screenshot/caption.
- **Founding "gấp đôi so với tiêu chuẩn":** only true if you shorten the standard trial to 15d (decision #2). Otherwise change to plain "30 ngày miễn phí".
- **Zalo "tích hợp trên mỗi báo cáo" / "1 chạm gửi Zalo":** not built yet (#7) — soften unless you build it.
- **PDF "BaoCao-<Tên>-Thang<N>.pdf · 148 KB":** filename/size not real yet (#8) — soften or build server-side PDF.
- **"Tải báo cáo tháng (PDF)":** label now matches, but the mechanism is browser print→Save-as-PDF, not a direct download (#8/#17).
- **"Daily backups":** only if the Supabase plan provides them (#24) — verify before claiming.
- **Onboarding "đăng ký và cài đặt … 30 phút":** real flow is manual provisioning (#25) — consider "liên hệ → tạo tài khoản trong 5 phút".
- **Payment methods:** only claim Momo/ZaloPay/VNPay if you can actually receive them (#5).

## List 4 — Needs live test (can't verify from code)

1. **Founding card live value** — confirm it currently reads "1/3" (proves the DB-cap theory) then reset to 5.
2. **Demo** — klazly.com/demo for all 3 roles shows rich seeded data, not an error (#9).
3. **Cross-center RLS** — log in as Center A, try to read Center B via API/DB (#21/#22).
4. **Supabase backup tier** — confirm daily backups are actually enabled (#24).
5. **60-second teacher flow** — time it on a real phone; the current form is a full long-form, not a chip-tap UI (Part 2).
