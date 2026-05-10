-- Optional short topic / title for a lesson, e.g. "My Home", "At the Zoo".
-- Shown to parents alongside the Unit + Lesson identifier so they have a
-- clearer sense of what the class covered. Run after lesson-unit.sql.

alter table public.lessons
  add column if not exists topic text;
