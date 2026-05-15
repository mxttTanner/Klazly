-- In-app feedback widget. Users (admin / teacher / parent) tap a
-- floating "Feedback" button, pick an emoji rating, optionally
-- type a comment. Submissions land in this table and feed the
-- /super-admin Feedback inbox.
--
-- Idempotent.

do $$ begin
  create type feedback_rating as enum ('sad', 'meh', 'happy');
exception when duplicate_object then null; end $$;

create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  -- center_id is nullable so demo users can submit too (they have
  -- a center_id but it's the shared demo center; we still want their
  -- feedback). SET NULL on center delete keeps the audit trail.
  center_id uuid references public.centers(id) on delete set null,
  -- user_id is nullable so anonymous/public-page feedback is possible
  -- later if we want to widen this widget's surface.
  user_id uuid references public.users(id) on delete set null,
  role text,
  rating feedback_rating not null,
  comment text,
  page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_center_idx on public.feedback (center_id, created_at desc);

alter table public.feedback enable row level security;

-- Super-admin reads via service role only. No public-facing select
-- policy — we never want a teacher seeing other teachers' feedback.
-- Writes also go through the service role from a server action that
-- has already auth-gated the caller via requireRole.
