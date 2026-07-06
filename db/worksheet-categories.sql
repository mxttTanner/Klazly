-- Worksheet categories — lightweight labels so the library and the lesson
-- form's picker can be browsed by kind instead of one long list. Nullable
-- text + CHECK (the convention for incrementally-added values, like
-- student_lesson_updates.attendance): existing rows stay NULL and the UI
-- shows them under "Other". Labels are i18n'd in the app
-- (src/messages/*.json → worksheets.categories.*); the DB stores the key.

alter table public.worksheets
  add column if not exists category text
  check (
    category is null
    or category in (
      'grammar', 'vocabulary', 'reading', 'writing', 'listening',
      'speaking', 'games', 'homework', 'exam', 'other'
    )
  );
