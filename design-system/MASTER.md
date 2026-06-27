# Klazly Design System — MASTER

Source of truth for the visual language. Every page inherits from this.
Direction: **premium-minimal / trust & authority**. Neutral surfaces,
generous whitespace, ONE accent, quiet motion. Color is information
(status + the single CTA), never decoration.

Decisions locked for this pass:
- **Light mode only.** Dark mode is dropped (it was never wired — no
  ThemeProvider mounts `.dark`). Do not add new `dark:` variants. Existing
  ones are harmless dead code.
- **Single blue accent.** The old four-color role system (admin=sky,
  teacher=violet, parent=rose, +amber) is retired. Collapse to `primary`
  + neutrals + semantic colors. Wayfinding between areas is done with text
  labels, not hue.

## Color (OKLch, defined in `src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--primary` | `oklch(0.52 0.13 245)` | Single accent: CTAs, active states, links, focus ring |
| `--primary-foreground` | `oklch(0.99 0 0)` | Text on primary |
| `--background` | `oklch(0.99 0.003 245)` | Page surface (faint brand-hued off-white) |
| `--card` | `oklch(1 0 0)` | Cards/panels — pure white, sits ABOVE background |
| `--muted` | `oklch(0.968 0.004 245)` | Subtle fills, table headers, chips |
| `--muted-foreground` | `oklch(0.45 0.01 245)` | Secondary text (>= 4.5:1 on white) |
| `--foreground` | `oklch(0.22 0.02 245)` | Primary text |
| `--border` | `oklch(0.92 0.004 245)` | Hairlines |
| `--accent` | `oklch(0.96 0.02 245)` | Hover tint for neutral interactive |
| `--success` | `oklch(0.6 0.13 155)` | Positive status only |
| `--warning` | `oklch(0.75 0.13 75)` | Caution status only |
| `--destructive` | `oklch(0.58 0.22 25)` | Errors/destructive only |

Neutrals carry a tiny chroma at hue 245 so whites/grays feel cohesive,
not clinical. **Do not** use `sky-*`, `violet-*`, `rose-*`, `amber-*` as
decoration. Semantic Tailwind colors (emerald/amber/red) are allowed ONLY
to express real status (e.g. "0 lessons this week" = warning).

## Typography — Be Vietnam Pro (already loaded as `--font-sans`)

Scale (px): `12 · 14 · 16(body) · 18 · 20 · 24 · 30 · 36 · 48 · 60`.
- Body 16px / line-height 1.6. Mobile body never < 16px.
- Headings: `font-semibold` or `font-bold`, `tracking-tight`.
- Max line length ~70ch (`max-w-[70ch]` / `max-w-2xl` for prose).
- Numbers in tables/stats: `tabular-nums`.

## Spacing & layout

- 4px base (Tailwind default scale).
- Section vertical rhythm: `py-16 sm:py-24` (marketing), `space-y-8`/`-10` (app).
- One container width: `max-w-6xl mx-auto px-4 sm:px-6`.
- Card padding: `p-5 sm:p-6`. Page gutters: `px-4 sm:px-6`.

## Radius

`--radius: 0.625rem` (10px). Cards 10px, inputs/buttons 8px (`rounded-lg`),
pills/badges full. No sharper, no rounder.

## Shadow — 3 steps only

| Class | Use |
|---|---|
| `shadow-sm` | Resting cards |
| `shadow-md` | Hover lift / raised panels |
| `shadow-lg` | Modals, popovers, sticky bars |

NO colored glows (`shadow-primary/40`, `shadow-2xl`). Depth = neutral
shadow + hairline border.

## Motion — "alive, not busy"

- **Entrances:** `<ScrollReveal>` only (fade + 6px rise, 700ms ease-out;
  stagger siblings <= 100ms). Already respects `prefers-reduced-motion`.
- **Hover:** 150–200ms on color/shadow/border. `-translate-y-0.5` allowed
  on cards. NO scale transforms on layout elements (only tiny icon nudges).
- **Loading:** skeletons on every async surface; reserve space (no jump).
- **Removed for good:** marquee, rotating conic ring, drifting mesh orbs,
  ticker, decorative pulsing dots. (Keyframes deleted from globals.css.)
- Everything gated on `prefers-reduced-motion: reduce`.

## Component conventions

- Buttons: `default` (primary), `outline`, `ghost`, `secondary`,
  `destructive`, `link`. One primary action per view.
- Cards: white, `border`, `rounded-xl`, `shadow-sm`, hover `shadow-md` +
  `-translate-y-0.5` when the whole card is a link.
- Empty states: centered icon + one line + one action. Use `EmptyState`.
- Tables: `muted` header, hairline row borders, `tabular-nums` for numbers.
- Icons: Lucide only, `size-4`/`size-5`, never emoji.
- Decoration ban: at most ONE faint neutral background flourish per page,
  never per card. No orbs inside cards.

## Copy

Run the `stop-slop` skill on English strings; apply the same discipline to
Vietnamese by hand. All user-facing text lives in `src/messages/vi.json`
(tone source of truth) + `en.json`. Benefit-led, specific, present tense,
no hype words. Buyer = Vietnamese English-center OWNER.

## Pre-ship checklist (per page)

- [ ] No `sky-/violet-/rose-/amber-` decoration; single accent only.
- [ ] No orbs/glows; shadows from the 3-step scale.
- [ ] Cards read distinct from page (white on off-white).
- [ ] Motion = ScrollReveal + 150–200ms hovers; reduced-motion safe.
- [ ] Mobile clean at 375 / 768 / 1024; no horizontal scroll.
- [ ] Text contrast >= 4.5:1; focus rings visible; touch targets >= 44px.
- [ ] Strings via i18n; copy passes stop-slop.
