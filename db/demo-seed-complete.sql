-- Comprehensive demo seed for Trung Tâm Anh Ngữ Hoa Mai.
-- Fills in everything a sales walkthrough needs to look polished:
--   • Programs assigned per class (KET / PET / Communication)
--   • Books per class
--   • Per-student overall_level (mixed)
--   • Attendance values on student_lesson_updates
--   • A few realistic parent ↔ teacher messages per child
--   • Center-level report customisation (intro / footer / signatures)
--   • Center contact info
--
-- Idempotent: every statement either uses ON CONFLICT or guards with
-- "WHERE foo IS NULL" so repeat runs are safe.
--
-- Prereqs: schema.sql + ALL feature migrations should already be applied:
--   class-book.sql, class-program.sql, center-programs.sql,
--   student-level.sql, lesson-topic.sql, lesson-unit.sql,
--   attendance.sql, report-settings.sql, messages.sql,
--   plus demo-enrich.sql (gives the lessons their unit/topic).
--
-- Run from the Supabase SQL editor.

-- ========================================================================
-- 0. Helpers — resolve the demo center id once.
-- ========================================================================
do $$
declare
  v_center_id uuid;
  v_class_junior_id uuid;
  v_class_senior_id uuid;
  v_teacher_huong_id uuid;
  v_parent_mai_id uuid;
begin
  select id into v_center_id
  from public.centers
  where name ilike 'Trung Tâm Anh Ngữ Hoa Mai'
  limit 1;

  if v_center_id is null then
    raise notice 'Demo center not found — skipping seed';
    return;
  end if;

  -- Get the teacher (huong) and parent (mai) ids if they exist.
  select id into v_teacher_huong_id
  from public.users
  where center_id = v_center_id
    and lower(email) = 'huong@hoamai.test'
  limit 1;

  select id into v_parent_mai_id
  from public.users
  where center_id = v_center_id
    and lower(email) = 'mai@parent.test'
  limit 1;

  -- ====================================================================
  -- 1. Center-level: report customisation + contact.
  -- ====================================================================
  update public.centers
  set
    contact_email = coalesce(contact_email, 'lienhe@hoamai.test'),
    contact_phone = coalesce(contact_phone, '+84 90 123 4567'),
    report_intro_text = coalesce(
      report_intro_text,
      'Kính gửi quý phụ huynh, báo cáo này tổng hợp tiến trình học tập gần đây của con tại Trung Tâm Anh Ngữ Hoa Mai. Mong quý phụ huynh dành thời gian xem và cùng con ôn lại nội dung đã học.'
    ),
    report_footer_text = coalesce(
      report_footer_text,
      'Báo cáo này có tính bảo mật và chỉ dành riêng cho phụ huynh của học sinh. Mọi thắc mắc xin liên hệ trung tâm.'
    ),
    report_show_summary = coalesce(report_show_summary, true),
    report_show_signatures = coalesce(report_show_signatures, true),
    report_signature_label_left = coalesce(
      report_signature_label_left, 'Giáo viên chủ nhiệm'
    ),
    report_signature_label_right = coalesce(
      report_signature_label_right, 'Phụ huynh / Người giám hộ'
    )
  where id = v_center_id;

  -- ====================================================================
  -- 2. Programs catalog — seed the canonical list if empty.
  -- ====================================================================
  insert into public.center_programs (center_id, label, sort_order)
  values
    (v_center_id, 'Cambridge KET (A2)', 10),
    (v_center_id, 'Cambridge PET (B1)', 20),
    (v_center_id, 'IELTS', 30),
    (v_center_id, 'TOEIC', 40),
    (v_center_id, 'English Communication', 50),
    (v_center_id, 'Young Learners', 60)
  on conflict (center_id, label) do nothing;

  -- ====================================================================
  -- 3. Classes — assign program + book where currently null.
  --    "Junior" classes → Young Learners + Family and Friends 2.
  --    "Senior" classes → Cambridge KET (A2) + Solutions Pre-Intermediate.
  --    Any other class → English Communication + a sensible default book.
  -- ====================================================================
  update public.classes
  set
    program = coalesce(program, 'Young Learners'),
    book = coalesce(book, 'Family and Friends 2')
  where center_id = v_center_id
    and name ilike '%junior%';

  -- Get one Junior class id for messaging-seed context.
  select id into v_class_junior_id
  from public.classes
  where center_id = v_center_id
    and name ilike '%junior%'
  order by name
  limit 1;

  update public.classes
  set
    program = coalesce(program, 'Cambridge KET (A2)'),
    book = coalesce(book, 'Solutions Pre-Intermediate')
  where center_id = v_center_id
    and name ilike '%senior%';

  select id into v_class_senior_id
  from public.classes
  where center_id = v_center_id
    and name ilike '%senior%'
  order by name
  limit 1;

  -- Anything else gets the communication default.
  update public.classes
  set
    program = coalesce(program, 'English Communication'),
    book = coalesce(book, 'Speakout Elementary')
  where center_id = v_center_id
    and program is null;

  -- ====================================================================
  -- 4. Students — set overall_level on a few so the colour-coded badges
  --    show up on the parent + admin views. Deterministic mix using
  --    student id hash.
  -- ====================================================================
  with shuffled as (
    select
      s.id,
      row_number() over (order by s.id) as rn
    from public.students s
    where s.center_id = v_center_id
  )
  update public.students s
  set overall_level = case (sh.rn % 4)
    when 0 then 'good'
    when 1 then 'okay'
    when 2 then 'good'
    else 'needs_attention'
  end
  from shuffled sh
  where s.id = sh.id
    and s.overall_level is null;

  -- ====================================================================
  -- 5. Attendance — backfill student_lesson_updates rows that don't have
  --    one yet. Deterministic split: ~75% present, 15% late, 10% absent.
  -- ====================================================================
  with picked as (
    select
      slu.id,
      mod(
        abs(('x' || substr(md5(slu.id::text), 1, 8))::bit(32)::int),
        100
      ) as r
    from public.student_lesson_updates slu
    join public.lessons l on l.id = slu.lesson_id
    join public.classes c on c.id = l.class_id
    where c.center_id = v_center_id
  )
  update public.student_lesson_updates u
  set attendance = case
    when p.r < 75 then 'present'
    when p.r < 90 then 'late'
    else 'absent'
  end
  from picked p
  where u.id = p.id
    and u.attendance is null;

  -- ====================================================================
  -- 6. Messages — a few realistic parent ↔ teacher exchanges per child
  --    that Mai is the parent of. Only seeds if there are currently zero
  --    messages for that student (so we don't duplicate on re-run).
  -- ====================================================================
  if v_teacher_huong_id is not null and v_parent_mai_id is not null then
    -- For each of Mai's children with no existing messages, insert a short
    -- exchange.
    insert into public.parent_teacher_messages
      (center_id, student_id, sender_user_id, body, created_at, read_at)
    select
      v_center_id, s.id, v_parent_mai_id,
      'Chào cô Hương ạ. Cuối tuần này con có bài tập gì không cô? Em muốn nhắc con học ạ.',
      now() - interval '3 days',
      now() - interval '3 days' + interval '1 hour'
    from public.students s
    where s.parent_user_id = v_parent_mai_id
      and s.center_id = v_center_id
      and not exists (
        select 1 from public.parent_teacher_messages m
        where m.student_id = s.id
      );

    insert into public.parent_teacher_messages
      (center_id, student_id, sender_user_id, body, created_at, read_at)
    select
      v_center_id, s.id, v_teacher_huong_id,
      'Chào chị Mai. Tuần này con có bài tập Workbook trang 14 (Unit 2). Con học khá ổn, chỉ cần luyện thêm phát âm các từ kết thúc bằng "s" thôi ạ. Em sẽ gửi thêm bài luyện ngắn qua đây.',
      now() - interval '3 days' + interval '2 hours',
      now() - interval '3 days' + interval '4 hours'
    from public.students s
    where s.parent_user_id = v_parent_mai_id
      and s.center_id = v_center_id
      and (
        select count(*) from public.parent_teacher_messages m
        where m.student_id = s.id
      ) = 1;

    insert into public.parent_teacher_messages
      (center_id, student_id, sender_user_id, body, created_at, read_at)
    select
      v_center_id, s.id, v_parent_mai_id,
      'Cảm ơn cô. Em sẽ nhắc con. Con có vẻ thích lớp lắm ạ, về nhà hay kể chuyện đi học :)',
      now() - interval '2 days',
      now() - interval '2 days' + interval '30 minutes'
    from public.students s
    where s.parent_user_id = v_parent_mai_id
      and s.center_id = v_center_id
      and (
        select count(*) from public.parent_teacher_messages m
        where m.student_id = s.id
      ) = 2;

    -- One UNREAD message from teacher → parent for visible "unread badge"
    -- demo on parent home + class roster.
    insert into public.parent_teacher_messages
      (center_id, student_id, sender_user_id, body, created_at, read_at)
    select
      v_center_id, s.id, v_teacher_huong_id,
      'Hôm nay con tham gia hoạt động nhóm rất tích cực. Phụ huynh khen con vài câu cho con thêm động lực nhé!',
      now() - interval '2 hours',
      null  -- unread → parent sees badge
    from public.students s
    where s.parent_user_id = v_parent_mai_id
      and s.center_id = v_center_id
      and (
        select count(*) from public.parent_teacher_messages m
        where m.student_id = s.id
      ) = 3;
  end if;

  raise notice 'Demo seed complete for center %', v_center_id;
end $$;
