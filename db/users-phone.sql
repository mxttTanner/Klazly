-- Phone-or-email auth migration.
-- Vietnamese parents and teachers commonly don't have a working email
-- address but everyone has a phone number (typically tied to Zalo). This
-- migration adds a phone column to public.users and relaxes the email
-- NOT NULL constraint so accounts can be created with phone alone.
--
-- Auth integration note: Supabase Auth still requires an email or phone
-- on every account, and native phone auth needs an SMS provider wired
-- up (Twilio / Vonage / eSMS.vn) which we don't have yet. The app uses
-- a "synthetic email" workaround: when a user is phone-only, we mint
-- a Supabase email like "+84901234567@phone.parent-portal.local" so
-- auth.admin.createUser succeeds, and store the real phone here. The
-- login form normalizes phone input and resolves it to the auth email
-- via public.users.phone before signInWithPassword. When SMS auth ever
-- ships, we can swap the synthetic-email pattern for native phone auth
-- without users noticing.
--
-- Idempotent: every statement guards on IF [NOT] EXISTS / DROP IF EXISTS.

-- 1. Relax email NOT NULL so phone-only accounts can be inserted.
alter table public.users
  alter column email drop not null;

-- 2. Add the phone column. Stores canonical "+84901234567" format —
--    normalization happens in app code (src/lib/phone.ts) before insert
--    so the DB only ever sees the canonical value.
alter table public.users
  add column if not exists phone text;

-- 3. CHECK constraint: at least one contact method must be set on every
--    user row. Replaces the implicit NOT NULL on email.
alter table public.users
  drop constraint if exists users_email_or_phone_required;
alter table public.users
  add constraint users_email_or_phone_required
  check (email is not null or phone is not null);

-- 4. Per-center uniqueness on email (case-insensitive) and phone.
--    Allows the same person to appear in multiple centers (a parent
--    whose kids attend two different schools) but blocks duplicates
--    within a single center. Partial indexes skip null values.
create unique index if not exists users_center_email_uniq
  on public.users (center_id, lower(email))
  where email is not null;

create unique index if not exists users_center_phone_uniq
  on public.users (center_id, phone)
  where phone is not null;

-- 5. Phone lookup index for login: users type their phone, app
--    normalizes it, looks up the row to find the auth email, signs in.
create index if not exists users_phone_idx
  on public.users (phone)
  where phone is not null;
