-- Optional short title per lesson (e.g. "Bài 1 - Family", "Unit 3 Lesson 2").
-- Used as the lesson's primary identifier on the parent view, so parents
-- don't have to read through vocabulary/grammar to know which lesson it was.
-- Run after schema.sql.

alter table public.lessons
  add column if not exists title text;
