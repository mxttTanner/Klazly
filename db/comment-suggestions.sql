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
  ('homework', 'vi', 'Bài tập còn một số lỗi — buổi sau lớp sẽ cùng xem lại.', 6)
on conflict (category, text) do nothing;
