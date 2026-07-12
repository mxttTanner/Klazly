-- ============================================================================
-- KLAZLY PRODUCTION DEPLOY SCRIPT — 2026-07-12
-- ============================================================================
-- Run ONCE in the Supabase SQL editor of the PRODUCTION project, top to
-- bottom, BEFORE (or together with) deploying the current app build.
--
-- Contents (each section is idempotent — safe to re-run):
--   1. worksheet-categories.sql   (worksheets: category column + filter)
--   2. comment-suggestions.sql    (daily comment suggestion bank)
--   3. student-photos.sql         (class photos: table, RLS, private bucket)
--   4. message-reads.sql          (per-user message read tracking — NEW,
--                                  fixes shared read-receipt corruption)
--   5. VERIFICATION               (read-only checks; every row must say ok)
--
-- Section 5 also verifies the 2026-07-02 audit fix pack that should already
-- be live (isolation suite passed 37/37 against prod on commit fd2f0ec).
-- If any of those checks fail, additionally run db/2026-07-02-audit-fixes.sql
-- and db/2026-07-02-worksheets-private.sql, then re-run section 5.
-- ============================================================================

-- ===================== 1/4: worksheet-categories.sql =====================
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

-- ===================== 2/4: comment-suggestions.sql ======================
-- Comment suggestions — a pre-written, human-authored comment bank for the
-- teacher lesson form. Nothing is generated at write-time; the app only
-- rotates which suggestions are SHOWN (5 per category per calendar day,
-- deterministic — see src/lib/comment-suggestions.ts). Tapping one drops
-- its text into the normal individual_note field, which saves through the
-- existing lesson path unchanged.
--
-- Each row carries a `lang` ('vi'/'en'); the form shows the bank matching
-- the teacher's UI locale (Vietnamese is the product default, so the pool
-- is seeded in both languages — the note text goes verbatim to parents).
--
-- Suggestions are GLOBAL across centers for now. To add per-center custom
-- suggestions later: add a nullable `center_id uuid references
-- public.centers(id) on delete cascade`, treat NULL as "global", and widen
-- the select policy to `center_id is null or center_id =
-- public.current_user_center_id()`. No UI for that yet by design.
--
-- Content is managed via migrations / service role only — there are no
-- insert/update/delete policies on purpose.

create table if not exists public.comment_suggestions (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (
    category in ('positive', 'needs_improvement', 'participation', 'homework')
  ),
  lang text not null default 'en' check (lang in ('vi', 'en')),
  text text not null check (char_length(text) > 0 and char_length(text) <= 500),
  active boolean not null default true,
  sort_order int,
  created_at timestamptz not null default now(),
  -- Also what makes the seed below idempotent (on conflict do nothing).
  constraint comment_suggestions_category_text_uniq unique (category, text)
);

create index if not exists comment_suggestions_lang_category_idx
  on public.comment_suggestions (lang, category)
  where active;

alter table public.comment_suggestions enable row level security;

-- Teachers and admins read the active bank; parents have no reason to see
-- it (they only ever see the final saved note text). Global by design —
-- the one deliberate exception to per-center query scoping (see header).
drop policy if exists "comment_suggestions_select" on public.comment_suggestions;
create policy "comment_suggestions_select"
  on public.comment_suggestions for select
  using (
    active
    and public.current_user_role() in ('teacher', 'admin')
  );

-- ==========================================================================
-- Seed — starter pool, English + Vietnamese. Idempotent via the
-- (category, text) unique key.
-- ==========================================================================

insert into public.comment_suggestions (category, lang, text, sort_order) values
  ('positive', 'en', 'Had a great attitude in class today.', 1),
  ('positive', 'en', 'Really engaged with today''s activities.', 2),
  ('positive', 'en', 'Showed good improvement with today''s vocabulary.', 3),
  ('positive', 'en', 'Helped classmates during group work.', 4),
  ('positive', 'en', 'Answered confidently during today''s lesson.', 5),
  ('positive', 'en', 'Stayed focused throughout the whole class.', 6),
  ('positive', 'en', 'Did a great job with today''s speaking activity.', 7),
  ('positive', 'en', 'Picked up today''s new words quickly.', 8),
  ('positive', 'en', 'Was very participative during games today.', 9),
  ('positive', 'en', 'Showed nice progress with pronunciation today.', 10),
  ('positive', 'en', 'Worked well with a partner today.', 11),
  ('positive', 'en', 'Completed all tasks with a positive attitude.', 12),
  ('positive', 'en', 'Asked great questions during the lesson.', 13),
  ('positive', 'en', 'Was a good listener today.', 14),
  ('positive', 'en', 'Showed confidence presenting to the class.', 15),
  ('needs_improvement', 'en', 'Had some trouble focusing today — worth keeping an eye on at home.', 1),
  ('needs_improvement', 'en', 'Struggled a bit with today''s vocabulary; some review at home would help.', 2),
  ('needs_improvement', 'en', 'Seemed a little tired today, participation was lower than usual.', 3),
  ('needs_improvement', 'en', 'Could use some extra practice with today''s grammar point.', 4),
  ('needs_improvement', 'en', 'Had some difficulty following instructions today.', 5),
  ('needs_improvement', 'en', 'Needs a bit more encouragement to speak up in class.', 6),
  ('needs_improvement', 'en', 'Found today''s listening activity challenging.', 7),
  ('needs_improvement', 'en', 'Was a little distracted during group work today.', 8),
  ('needs_improvement', 'en', 'Could benefit from reviewing today''s lesson at home.', 9),
  ('needs_improvement', 'en', 'Had some trouble staying on task today.', 10),
  ('participation', 'en', 'Volunteered to answer several times today.', 1),
  ('participation', 'en', 'Was a bit quieter than usual today.', 2),
  ('participation', 'en', 'Took a little time to warm up but joined in well.', 3),
  ('participation', 'en', 'Worked actively in today''s pair/group activities.', 4),
  ('participation', 'en', 'Needed some encouragement to join in today.', 5),
  ('participation', 'en', 'Was one of the first to raise a hand today.', 6),
  ('participation', 'en', 'Preferred listening over speaking today, which is okay.', 7),
  ('participation', 'en', 'Got more involved as the class went on.', 8),
  ('homework', 'en', 'Completed homework fully and correctly.', 1),
  ('homework', 'en', 'Homework was mostly done, a few items missed.', 2),
  ('homework', 'en', 'Homework wasn''t completed today.', 3),
  ('homework', 'en', 'Homework showed good effort.', 4),
  ('homework', 'en', 'A reminder about today''s homework was given.', 5),
  ('homework', 'en', 'Homework had some errors — happy to review together next class.', 6),
  ('positive', 'vi', 'Hôm nay con có thái độ học tập rất tốt.', 1),
  ('positive', 'vi', 'Con tham gia rất tích cực các hoạt động hôm nay.', 2),
  ('positive', 'vi', 'Con tiến bộ rõ với phần từ vựng hôm nay.', 3),
  ('positive', 'vi', 'Con biết giúp đỡ các bạn khi làm việc nhóm.', 4),
  ('positive', 'vi', 'Con trả lời rất tự tin trong buổi học hôm nay.', 5),
  ('positive', 'vi', 'Con tập trung tốt suốt cả buổi học.', 6),
  ('positive', 'vi', 'Con làm rất tốt hoạt động luyện nói hôm nay.', 7),
  ('positive', 'vi', 'Con tiếp thu từ mới hôm nay rất nhanh.', 8),
  ('positive', 'vi', 'Con tham gia trò chơi hôm nay rất sôi nổi.', 9),
  ('positive', 'vi', 'Phát âm của con hôm nay tiến bộ rõ rệt.', 10),
  ('positive', 'vi', 'Con phối hợp với bạn rất tốt trong giờ học hôm nay.', 11),
  ('positive', 'vi', 'Con hoàn thành mọi nhiệm vụ với thái độ tích cực.', 12),
  ('positive', 'vi', 'Con đặt những câu hỏi rất hay trong giờ học.', 13),
  ('positive', 'vi', 'Hôm nay con lắng nghe rất tốt.', 14),
  ('positive', 'vi', 'Con tự tin khi trình bày trước lớp.', 15),
  ('needs_improvement', 'vi', 'Hôm nay con hơi khó tập trung — gia đình lưu ý thêm ở nhà giúp con nhé.', 1),
  ('needs_improvement', 'vi', 'Con còn gặp khó với từ vựng hôm nay; ôn lại ở nhà sẽ giúp con nhiều.', 2),
  ('needs_improvement', 'vi', 'Hôm nay con có vẻ hơi mệt, tham gia ít hơn mọi khi.', 3),
  ('needs_improvement', 'vi', 'Con cần luyện thêm phần ngữ pháp của buổi học hôm nay.', 4),
  ('needs_improvement', 'vi', 'Hôm nay con còn gặp khó khi làm theo hướng dẫn.', 5),
  ('needs_improvement', 'vi', 'Con cần được động viên thêm để mạnh dạn phát biểu trong lớp.', 6),
  ('needs_improvement', 'vi', 'Bài nghe hôm nay còn hơi khó với con.', 7),
  ('needs_improvement', 'vi', 'Con hơi mất tập trung khi làm việc nhóm hôm nay.', 8),
  ('needs_improvement', 'vi', 'Con nên ôn lại bài học hôm nay ở nhà.', 9),
  ('needs_improvement', 'vi', 'Hôm nay con còn khó duy trì sự tập trung vào nhiệm vụ.', 10),
  ('participation', 'vi', 'Hôm nay con xung phong trả lời nhiều lần.', 1),
  ('participation', 'vi', 'Hôm nay con trầm hơn mọi khi một chút.', 2),
  ('participation', 'vi', 'Con cần chút thời gian làm quen nhưng sau đó tham gia rất tốt.', 3),
  ('participation', 'vi', 'Con hoạt động tích cực trong các hoạt động cặp/nhóm hôm nay.', 4),
  ('participation', 'vi', 'Hôm nay con cần được khích lệ mới tham gia hoạt động.', 5),
  ('participation', 'vi', 'Con là một trong những bạn giơ tay phát biểu đầu tiên hôm nay.', 6),
  ('participation', 'vi', 'Hôm nay con thích lắng nghe hơn là nói — điều này hoàn toàn bình thường.', 7),
  ('participation', 'vi', 'Càng về cuối buổi con càng tham gia tích cực hơn.', 8),
  ('homework', 'vi', 'Con hoàn thành đầy đủ và chính xác bài tập về nhà.', 1),
  ('homework', 'vi', 'Bài tập về nhà làm gần đủ, còn sót một vài phần.', 2),
  ('homework', 'vi', 'Hôm nay con chưa hoàn thành bài tập về nhà.', 3),
  ('homework', 'vi', 'Bài tập về nhà cho thấy con đã rất cố gắng.', 4),
  ('homework', 'vi', 'Con đã được nhắc về bài tập về nhà hôm nay.', 5),
  ('homework', 'vi', 'Bài tập còn một số lỗi — buổi sau lớp sẽ cùng xem lại.', 6),
  -- Expansion 2026-07-06: pools grown to multiples of 5 (positive 20,
  -- needs_improvement 20, participation 15, homework 15 per language) so the
  -- shuffle-bag rotation cycles with no repeats and the thin categories vary.
  ('positive', 'en', 'Showed real curiosity about today''s topic.', 16),
  ('positive', 'en', 'Encouraged a classmate who was struggling.', 17),
  ('positive', 'en', 'Corrected their own mistakes without being asked.', 18),
  ('positive', 'en', 'Brought great energy to the class today.', 19),
  ('positive', 'en', 'Remembered vocabulary from earlier lessons.', 20),
  ('needs_improvement', 'en', 'Rushed through today''s work and made avoidable mistakes.', 11),
  ('needs_improvement', 'en', 'Could speak up a little more during discussions.', 12),
  ('needs_improvement', 'en', 'Needs to check their work before finishing.', 13),
  ('needs_improvement', 'en', 'Found it hard to sit still and focus today.', 14),
  ('needs_improvement', 'en', 'Would benefit from more reading practice at home.', 15),
  ('needs_improvement', 'en', 'Mixed up some words we learned recently.', 16),
  ('needs_improvement', 'en', 'Needs a gentle reminder to bring materials to class.', 17),
  ('needs_improvement', 'en', 'Was reluctant to try the harder exercises today.', 18),
  ('needs_improvement', 'en', 'Could use more confidence when speaking aloud.', 19),
  ('needs_improvement', 'en', 'Would improve faster with a little daily review at home.', 20),
  ('participation', 'en', 'Shared an interesting idea with the class today.', 9),
  ('participation', 'en', 'Listened carefully to classmates'' answers.', 10),
  ('participation', 'en', 'Asked to try the activity again to improve.', 11),
  ('participation', 'en', 'Led their group confidently today.', 12),
  ('participation', 'en', 'Joined every activity without hesitation.', 13),
  ('participation', 'en', 'Answered in full sentences today.', 14),
  ('participation', 'en', 'Helped keep the group on task.', 15),
  ('homework', 'en', 'Homework was neat and carefully done.', 7),
  ('homework', 'en', 'Homework was late but completed well.', 8),
  ('homework', 'en', 'Please help remind them about tonight''s homework.', 9),
  ('homework', 'en', 'Homework showed they understood the lesson.', 10),
  ('homework', 'en', 'Only part of the homework was finished.', 11),
  ('homework', 'en', 'Homework needs checking for spelling.', 12),
  ('homework', 'en', 'Great effort on the homework, keep it up.', 13),
  ('homework', 'en', 'Homework was done independently today.', 14),
  ('homework', 'en', 'Please sign off on today''s homework at home.', 15),
  ('positive', 'vi', 'Con tỏ ra rất tò mò, hứng thú với chủ đề hôm nay.', 16),
  ('positive', 'vi', 'Con động viên một bạn khác khi bạn gặp khó khăn.', 17),
  ('positive', 'vi', 'Con tự sửa lỗi của mình mà không cần nhắc.', 18),
  ('positive', 'vi', 'Con mang đến năng lượng tích cực cho cả lớp hôm nay.', 19),
  ('positive', 'vi', 'Con nhớ được từ vựng của các buổi học trước.', 20),
  ('needs_improvement', 'vi', 'Hôm nay con làm bài hơi vội nên mắc một số lỗi không đáng có.', 11),
  ('needs_improvement', 'vi', 'Con nên mạnh dạn phát biểu nhiều hơn trong giờ thảo luận.', 12),
  ('needs_improvement', 'vi', 'Con cần kiểm tra lại bài trước khi hoàn thành.', 13),
  ('needs_improvement', 'vi', 'Hôm nay con khó ngồi yên và tập trung.', 14),
  ('needs_improvement', 'vi', 'Con nên luyện đọc thêm ở nhà.', 15),
  ('needs_improvement', 'vi', 'Con còn nhầm lẫn một vài từ mới học gần đây.', 16),
  ('needs_improvement', 'vi', 'Con cần được nhắc nhẹ nhàng mang đủ đồ dùng học tập đến lớp.', 17),
  ('needs_improvement', 'vi', 'Hôm nay con còn ngại thử các bài tập khó hơn.', 18),
  ('needs_improvement', 'vi', 'Con cần tự tin hơn khi nói thành tiếng.', 19),
  ('needs_improvement', 'vi', 'Con sẽ tiến bộ nhanh hơn nếu ôn lại bài mỗi ngày ở nhà.', 20),
  ('participation', 'vi', 'Hôm nay con chia sẻ một ý tưởng thú vị với cả lớp.', 9),
  ('participation', 'vi', 'Con lắng nghe câu trả lời của các bạn rất chăm chú.', 10),
  ('participation', 'vi', 'Con xin làm lại hoạt động để làm tốt hơn.', 11),
  ('participation', 'vi', 'Hôm nay con tự tin dẫn dắt nhóm của mình.', 12),
  ('participation', 'vi', 'Con tham gia mọi hoạt động mà không ngần ngại.', 13),
  ('participation', 'vi', 'Hôm nay con trả lời bằng câu đầy đủ.', 14),
  ('participation', 'vi', 'Con giúp nhóm tập trung vào nhiệm vụ.', 15),
  ('homework', 'vi', 'Bài tập về nhà trình bày sạch sẽ và cẩn thận.', 7),
  ('homework', 'vi', 'Bài tập nộp hơi trễ nhưng làm khá tốt.', 8),
  ('homework', 'vi', 'Nhờ gia đình nhắc con làm bài tập tối nay giúp ạ.', 9),
  ('homework', 'vi', 'Bài tập cho thấy con đã hiểu bài.', 10),
  ('homework', 'vi', 'Con mới hoàn thành một phần bài tập về nhà.', 11),
  ('homework', 'vi', 'Bài tập cần kiểm tra lại phần chính tả.', 12),
  ('homework', 'vi', 'Con làm bài tập rất cố gắng, hãy tiếp tục phát huy nhé.', 13),
  ('homework', 'vi', 'Hôm nay con tự làm bài tập một mình.', 14),
  ('homework', 'vi', 'Nhờ gia đình xác nhận bài tập về nhà hôm nay của con ạ.', 15)
on conflict (category, text) do nothing;

-- ===================== 3/4: student-photos.sql ===========================
-- Student photos — teachers photograph class moments and tag the students
-- in the shot; parents see (only) their own child's photos in the child's
-- timeline. One photo can be tagged to multiple students.
--
-- STORAGE STANCE (mirrors db/2026-07-02-worksheets-private.sql): the
-- `student-photos` bucket is born PRIVATE and gets NO storage.objects
-- policies at all — clients never talk to Storage directly. Uploads go
-- through the server action (service role, after requireRole + roster
-- validation) and reads happen via short-lived signed URLs minted by the
-- server ONLY for rows the caller could already read through table RLS
-- (src/lib/photo-url.ts). Guessing a storage path yields nothing without
-- a valid signature. Bucket-level file_size_limit / allowed_mime_types are
-- a hard backstop enforced by Supabase Storage itself, independent of app
-- code.

-- ==========================================================================
-- Bucket (private; 5MB cap; images only)
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ==========================================================================
-- Tables
-- ==========================================================================

create table if not exists public.student_photos (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references public.centers(id) on delete cascade,
  -- SET NULL like worksheets.uploaded_by: removing a teacher keeps the
  -- photos (parents keep the record); admins still manage them.
  uploaded_by uuid references public.users(id) on delete set null,
  -- Path convention: {center_id}/{photo_id}.{ext}. The CHECK pins every
  -- row's object path inside its own center's storage prefix — without it,
  -- a teacher hitting PostgREST directly could insert/update a row whose
  -- storage_path points into ANOTHER center's prefix and have the server
  -- sign it for them. A table constraint (not just a policy) so it also
  -- binds service-role writes.
  storage_path text not null
    check (storage_path like center_id::text || '/%'),
  caption text check (caption is null or char_length(caption) <= 200),
  -- Date the photo belongs to in the timeline (VN-local; set by the app).
  taken_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists student_photos_center_idx
  on public.student_photos (center_id);
create index if not exists student_photos_uploaded_by_idx
  on public.student_photos (uploaded_by);

-- One photo ↔ many students (group shots). Deleting a photo cascades its
-- tags; the storage object is removed by the delete server action.
create table if not exists public.student_photo_tags (
  photo_id uuid not null references public.student_photos(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, student_id)
);
create index if not exists student_photo_tags_student_idx
  on public.student_photo_tags (student_id);

-- ==========================================================================
-- RLS helper functions (SECURITY DEFINER to break policy recursion, same
-- rationale as db/fix-rls-recursion.sql)
-- ==========================================================================

create or replace function public.photo_center_id(p_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.student_photos where id = p_photo_id
$$;

create or replace function public.photo_uploaded_by(p_photo_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select uploaded_by from public.student_photos where id = p_photo_id
$$;

-- Is the current user the parent of at least one student tagged on this
-- photo? THE rule that scopes parents to their own child's photos.
create or replace function public.is_parent_of_tagged_student(p_photo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_photo_tags t
    join public.students s on s.id = t.student_id
    where t.photo_id = p_photo_id
      and s.parent_user_id = auth.uid()
  )
$$;

-- Does the current user teach the class this student is in? (Same
-- teacher→class→student chain as students_select.)
create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = p_student_id
      and c.teacher_id = auth.uid()
  )
$$;

create or replace function public.student_center_id(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select center_id from public.students where id = p_student_id
$$;

-- ==========================================================================
-- RLS: student_photos
--   admin   → all photos in their center
--   teacher → photos they uploaded, in their center
--   parent  → READ ONLY, and only photos tagged to their own child(ren)
-- (super-admin/platform ops use the service role, which bypasses RLS.)
-- ==========================================================================

alter table public.student_photos enable row level security;

drop policy if exists "student_photos_select" on public.student_photos;
create policy "student_photos_select"
  on public.student_photos for select
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'parent'
      and center_id = public.current_user_center_id()
      and public.is_parent_of_tagged_student(id)
    )
  );

drop policy if exists "student_photos_insert" on public.student_photos;
create policy "student_photos_insert"
  on public.student_photos for insert
  with check (
    center_id = public.current_user_center_id()
    and uploaded_by = auth.uid()
    and public.current_user_role() in ('teacher', 'admin')
  );

drop policy if exists "student_photos_update" on public.student_photos;
create policy "student_photos_update"
  on public.student_photos for update
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  )
  -- WITH CHECK mirrors USING so the NEW row must still satisfy the same
  -- ownership rule — otherwise a teacher could reassign uploaded_by (handing
  -- delete rights to someone else / orphaning the photo to admin-only).
  with check (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  );

drop policy if exists "student_photos_delete" on public.student_photos;
create policy "student_photos_delete"
  on public.student_photos for delete
  using (
    (
      public.current_user_role() = 'admin'
      and center_id = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by = auth.uid()
      and center_id = public.current_user_center_id()
    )
  );

-- No parent write policies exist → parents cannot insert/update/delete.

-- ==========================================================================
-- RLS: student_photo_tags
--   admin   → tags on photos in their center
--   teacher → tags on their own photos; may only tag students of classes
--             they teach (existing teacher→class→student scoping)
--   parent  → READ ONLY, only tag rows pointing at their own child
-- ==========================================================================

alter table public.student_photo_tags enable row level security;

drop policy if exists "student_photo_tags_select" on public.student_photo_tags;
create policy "student_photo_tags_select"
  on public.student_photo_tags for select
  using (
    (
      public.current_user_role() = 'admin'
      and public.photo_center_id(photo_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'teacher'
      and public.photo_uploaded_by(photo_id) = auth.uid()
      -- Center check too: a teacher moved to another center must not keep
      -- reading tag rows from photos they uploaded at the old center.
      and public.photo_center_id(photo_id) = public.current_user_center_id()
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_parent_of_student(student_id)
    )
  );

drop policy if exists "student_photo_tags_insert" on public.student_photo_tags;
create policy "student_photo_tags_insert"
  on public.student_photo_tags for insert
  with check (
    -- The tagged student must live in the same center as the photo, and
    -- that center must be the caller's own.
    public.photo_center_id(photo_id) = public.current_user_center_id()
    and public.student_center_id(student_id) = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and public.photo_uploaded_by(photo_id) = auth.uid()
        and public.is_teacher_of_student(student_id)
      )
    )
  );

drop policy if exists "student_photo_tags_delete" on public.student_photo_tags;
create policy "student_photo_tags_delete"
  on public.student_photo_tags for delete
  using (
    public.photo_center_id(photo_id) = public.current_user_center_id()
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'teacher'
        and public.photo_uploaded_by(photo_id) = auth.uid()
      )
    )
  );

-- ===================== 4/4: message-reads.sql ============================
-- ==========================================================================
-- Per-user message read tracking (fixes shared read_at corruption).
--
-- parent_teacher_messages.read_at is ONE column shared by up to three
-- participants (parent, teacher, admin). mark_messages_read stamped it for
-- whoever opened the thread first — so an admin monitoring a thread killed
-- the parent's unread badge and showed the teacher a false "read" receipt
-- before the parent ever saw the message.
--
-- This migration adds a message_reads table (one row per reader per
-- message), rewrites mark_messages_read to record the caller's own read,
-- and adds unread_message_counts() so badge queries count "messages I
-- have not read" instead of the shared flag. read_at is kept and still
-- stamped for backward compatibility but is no longer read by the app.
--
-- Idempotent: safe to run more than once.
-- ==========================================================================

create table if not exists public.message_reads (
  message_id uuid not null
    references public.parent_teacher_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Denormalized so read receipts don't need a cross-role join on users:
  -- a staff-sent message is "read" when the PARENT read it; a parent-sent
  -- message is "read" when a STAFF member (teacher/admin) read it.
  reader_role text not null check (reader_role in ('parent', 'teacher', 'admin')),
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_user_idx
  on public.message_reads(user_id);

alter table public.message_reads enable row level security;

-- Readers see their own read rows (for their unread state); senders see
-- read rows on messages they sent (for read receipts). Nobody else.
-- No insert/update/delete policies: all writes go through the
-- mark_messages_read SECURITY DEFINER function below.
drop policy if exists "mr_select" on public.message_reads;
create policy "mr_select"
  on public.message_reads for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.parent_teacher_messages m
      where m.id = message_reads.message_id
        and m.sender_user_id = auth.uid()
    )
  );

-- Rewritten: records the caller's own read rows. Still stamps the legacy
-- read_at column so anything not yet migrated keeps working; the app no
-- longer reads it.
create or replace function public.mark_messages_read(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_user_role();
  v_allowed boolean;
begin
  v_allowed :=
    (
      v_role = 'parent'
      and exists (
        select 1 from public.students s
        where s.id = p_student_id and s.parent_user_id = auth.uid()
      )
    )
    or (
      v_role = 'teacher'
      and exists (
        select 1 from public.students s
        join public.classes c on c.id = s.class_id
        where s.id = p_student_id and c.teacher_id = auth.uid()
      )
    )
    or (
      v_role = 'admin'
      and exists (
        select 1 from public.students s
        where s.id = p_student_id
          and s.center_id = public.current_user_center_id()
      )
    );
  if not v_allowed then
    return;
  end if;

  insert into public.message_reads (message_id, user_id, reader_role)
  select m.id, auth.uid(), v_role
  from public.parent_teacher_messages m
  where m.student_id = p_student_id
    and m.sender_user_id <> auth.uid()   -- only messages you RECEIVED
  on conflict do nothing;

  -- Legacy stamp, kept for backward compatibility only.
  update public.parent_teacher_messages m
  set read_at = now()
  where m.student_id = p_student_id
    and m.read_at is null
    and m.sender_user_id <> auth.uid();
end;
$$;

revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- Per-student unread counts for the CALLER: messages in the student's
-- thread that the caller may see, did not send, and has no read row for.
-- Replaces the app-side "read_at is null" count queries.
create or replace function public.unread_message_counts(p_student_ids uuid[])
returns table (student_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.student_id, count(*)::bigint as unread
  from public.parent_teacher_messages m
  where m.student_id = any(p_student_ids)
    and m.sender_user_id <> auth.uid()
    and (
      (
        public.current_user_role() = 'parent'
        and exists (
          select 1 from public.students s
          where s.id = m.student_id and s.parent_user_id = auth.uid()
        )
      )
      or (
        public.current_user_role() = 'teacher'
        and exists (
          select 1 from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = m.student_id and c.teacher_id = auth.uid()
        )
      )
      or (
        public.current_user_role() = 'admin'
        and m.center_id = public.current_user_center_id()
      )
    )
    and not exists (
      select 1 from public.message_reads r
      where r.message_id = m.id and r.user_id = auth.uid()
    )
  group by m.student_id
$$;

revoke all on function public.unread_message_counts(uuid[]) from public;
grant execute on function public.unread_message_counts(uuid[]) to authenticated;

-- --------------------------------------------------------------------------
-- Backfill: without this, every historical message becomes "unread" for
-- everyone on deploy (badge explosion). The old model can't tell us WHO
-- read a message, so credit the natural recipient(s) of each already-read
-- message. Idempotent via ON CONFLICT DO NOTHING.
-- --------------------------------------------------------------------------

-- Staff-sent read messages -> credit the student's parent.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, s.parent_user_id, 'parent', m.read_at
from public.parent_teacher_messages m
join public.users sender on sender.id = m.sender_user_id
join public.students s on s.id = m.student_id
where m.read_at is not null
  and sender.role in ('teacher', 'admin')
  and s.parent_user_id is not null
on conflict do nothing;

-- Parent-sent read messages -> credit the student's current class teacher.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, c.teacher_id, 'teacher', m.read_at
from public.parent_teacher_messages m
join public.users sender on sender.id = m.sender_user_id
join public.students s on s.id = m.student_id
join public.classes c on c.id = s.class_id
where m.read_at is not null
  and sender.role = 'parent'
  and c.teacher_id is not null
on conflict do nothing;

-- Credit center admins for every already-read message they didn't send,
-- so the admin inbox doesn't light up with years of old threads.
insert into public.message_reads (message_id, user_id, reader_role, read_at)
select m.id, u.id, 'admin', m.read_at
from public.parent_teacher_messages m
join public.users u
  on u.center_id = m.center_id and u.role = 'admin'
where m.read_at is not null
  and u.id <> m.sender_user_id
on conflict do nothing;

-- ===================== 5: VERIFICATION (read-only) =========================
-- Every row must show ok = true. If an "audit-fix-pack" row is false, run
-- db/2026-07-02-audit-fixes.sql (and the worksheets-private flip), then
-- re-run this section.

select 'this deploy: worksheets.category column' as check, exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'worksheets'
    and column_name = 'category'
) as ok
union all
select 'this deploy: comment_suggestions table has rows', exists (
  select 1 from public.comment_suggestions limit 1
)
union all
select 'this deploy: student_photos table + RLS', exists (
  select 1 from pg_tables
  where schemaname = 'public' and tablename = 'student_photos'
    and rowsecurity = true
)
union all
select 'this deploy: student-photos bucket is PRIVATE', exists (
  select 1 from storage.buckets
  where id = 'student-photos' and public = false
)
union all
select 'this deploy: message_reads table + RLS', exists (
  select 1 from pg_tables
  where schemaname = 'public' and tablename = 'message_reads'
    and rowsecurity = true
)
union all
select 'this deploy: unread_message_counts() exists', exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'unread_message_counts'
)
union all
select 'audit-fix-pack: class_center_id() helper exists', exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'class_center_id'
)
union all
select 'audit-fix-pack: broad ptm_update_read policy is GONE', not exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'parent_teacher_messages'
    and policyname = 'ptm_update_read'
)
union all
select 'audit-fix-pack: lessons_class_date_uniq index exists', exists (
  select 1 from pg_indexes
  where schemaname = 'public' and indexname = 'lessons_class_date_uniq'
)
union all
select 'audit-fix-pack: slu unique index exists', exists (
  select 1 from pg_indexes
  where schemaname = 'public'
    and tablename = 'student_lesson_updates'
    and indexdef like '%UNIQUE%'
)
union all
select 'audit-fix-pack: worksheets bucket is PRIVATE', exists (
  select 1 from storage.buckets where id = 'worksheets' and public = false
)
union all
select 'audit-fix-pack: users.must_change_password column', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'users'
    and column_name = 'must_change_password'
);
