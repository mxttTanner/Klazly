# Parent Portal SaaS

## What this is
Web-based SaaS for English language centers in Vietnam. Centers pay to use it. Teachers update lesson info after each class. Parents log in to see their child's progress. Three user roles: center_admin, teacher, parent.

## Tech stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase (Postgres + Auth + Row Level Security)
- Deployed on Vercel
- Vietnamese is primary language, English toggle available

## Critical rules
- Multi-tenant: every query MUST be scoped to the user's center_id
- Row Level Security policies on every table — no exceptions
- Mobile-first responsive design (most parents use phones)
- Professional tone, no emojis in UI text
- All user-facing strings go through translations file (vi.json, en.json)
- Vietnamese is the default language
- Commit to git after each working feature

## Database schema
- centers: id, name, logo_url, contact_email, contact_phone, subscription_status, created_at
- users: id, email, password_hash, role (admin/teacher/parent), center_id, full_name, created_at
- classes: id, center_id, name, teacher_id, schedule_text, created_at
- students: id, center_id, class_id, full_name, age, parent_user_id, created_at
- lessons: id, class_id, teacher_id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note, created_at
- student_lesson_updates: id, lesson_id, student_id, behavior_rating (great/good/okay/needs_attention), individual_note, homework_completed, created_at
- audit_log: id, user_id, action, entity_type, entity_id, timestamp

## Build status
- [x] Project setup (Next.js, Tailwind, shadcn/ui, Supabase)
- [ ] Database schema and RLS policies
- [ ] Authentication with 3 roles
- [ ] Seed script with fake data
- [ ] Center admin: manage teachers, classes, students
- [ ] Teacher: lesson update form
- [ ] Parent: view child's progress
- [ ] Vietnamese and English translations
- [ ] Print-friendly parent report
- [ ] Analytics on admin dashboard
- [ ] Demo mode for sales

## Known issues
(none yet)

## How to run locally
1. `cp .env.local.example .env.local` and fill in Supabase project URL + anon key + service role key
2. In Supabase SQL editor, run `db/schema.sql` once
3. `npm install`
4. `npm run dev` — open http://localhost:3000

## Project structure
- `src/app/` — Next.js App Router routes (auth pages, admin/, teacher/, parent/, demo/)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/` — app components (forms, tables, layouts)
- `src/lib/supabase/` — client.ts (browser), server.ts (RSC/route handlers), middleware.ts
- `src/lib/i18n/` — next-intl configuration
- `src/messages/` — vi.json (default), en.json
- `db/schema.sql` — single-file schema + RLS policies
- `db/seed.sql` — fake Vietnamese data for dev/demo
