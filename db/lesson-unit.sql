-- Structured lesson identifier: separate "unit" and "lesson number" fields
-- so parents see something like "Bài 1 — Phần 2" instead of having to read
-- all the vocab/grammar to recognize the lesson.
-- Run after schema.sql.

alter table public.lessons
  add column if not exists unit text;

alter table public.lessons
  add column if not exists lesson_number text;
