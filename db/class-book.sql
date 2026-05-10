-- Curriculum book per class (e.g. "Family and Friends 2", "Solutions Pre-Intermediate").
-- Shown on the admin dashboard so the owner can see at a glance which book each
-- class is studying. Optional. Run after schema.sql.

alter table public.classes
  add column if not exists book text;
