-- Enrich the demo center's lessons (Hoa Mai) with realistic Unit / Lesson /
-- Topic + varied per-student feedback so the parent demo page actually looks
-- like a real progress report. Idempotent: safe to re-run.
--
-- Targets center "Trung Tâm Anh Ngữ Hoa Mai". Adjust if your demo center
-- has a different name.

-- --------------------------------------------------------------------------
-- 1. Per-lesson body (Unit / Lesson / Topic + vocab / grammar / homework /
--    speaking / general note). Picked by oldest-first ordering inside each
--    class so Lesson 1 is the earliest, Lesson 2 the next, etc.
-- --------------------------------------------------------------------------

with center_id as (
  select id from public.centers
  where name ilike 'Trung Tâm Anh Ngữ Hoa Mai' limit 1
),
classes_ranked as (
  select
    c.id           as class_id,
    c.name         as class_name,
    -- Unit topic depends on class level
    case
      when c.name ilike '%junior%' then 'Unit 1'
      else 'Unit 3'
    end as unit_label
  from public.classes c
  where c.center_id = (select id from center_id)
),
lessons_ranked as (
  select
    l.id,
    l.class_id,
    cr.class_name,
    cr.unit_label,
    row_number() over (
      partition by l.class_id order by l.lesson_date asc
    ) as seq
  from public.lessons l
  join classes_ranked cr on cr.class_id = l.class_id
)
update public.lessons l
set
  unit          = lr.unit_label,
  lesson_number = 'Lesson ' || lr.seq,
  topic = case
    when lr.class_name ilike '%junior%' then
      case lr.seq
        when 1 then 'My Family'
        when 2 then 'My Home'
        when 3 then 'At School'
        when 4 then 'Daily Routines'
        else 'Free Time'
      end
    else
      case lr.seq
        when 1 then 'Travel & Holidays'
        when 2 then 'Healthy Habits'
        when 3 then 'My Future Job'
        when 4 then 'Technology in Daily Life'
        else 'Around the World'
      end
  end,
  vocabulary = case
    when lr.class_name ilike '%junior%' then
      case lr.seq
        when 1 then 'family, mother, father, sister, brother, grandparents, aunt, uncle'
        when 2 then 'living room, kitchen, bedroom, bathroom, garden, balcony, sofa, table'
        when 3 then 'classroom, teacher, student, blackboard, pencil, eraser, schoolbag'
        when 4 then 'wake up, brush teeth, have breakfast, go to school, do homework, sleep'
        else 'play, watch TV, read, draw, ride a bike, listen to music, sing, dance'
      end
    else
      case lr.seq
        when 1 then 'travel, suitcase, passport, beach, mountain, hotel, sightseeing, souvenir'
        when 2 then 'exercise, vegetables, fruit, water, sleep, vitamin, energy, healthy diet'
        when 3 then 'doctor, engineer, teacher, designer, salary, interview, career, ambition'
        when 4 then 'smartphone, application, internet, social media, screen time, device, online'
        else 'culture, tradition, language, country, capital, currency, custom, festival'
      end
  end,
  grammar_point = case
    when lr.class_name ilike '%junior%' then
      case lr.seq
        when 1 then 'This is my … / These are my …'
        when 2 then 'There is / There are — There is a sofa in the living room.'
        when 3 then 'Wh-questions: What / Where / Who'
        when 4 then 'Present simple — I wake up at 6 a.m.'
        else 'Can / Can''t — I can ride a bike.'
      end
    else
      case lr.seq
        when 1 then 'Past simple vs Present perfect — I went / I have been'
        when 2 then 'Should / Shouldn''t for advice'
        when 3 then 'Future plans: going to / will'
        when 4 then 'Comparatives & superlatives — faster, the fastest'
        else 'Reported speech — She said that …'
      end
  end,
  speaking_activity = case
    when lr.class_name ilike '%junior%' then
      case lr.seq
        when 1 then 'Pair-work: introduce 3 family members using a photo.'
        when 2 then 'Describe your bedroom to a partner using "There is/are".'
        when 3 then 'Role-play: a student asking the teacher for help.'
        when 4 then 'Tell your daily routine using sequence words: first, then, finally.'
        else 'Mini-presentation: "Three things I love doing in my free time".'
      end
    else
      case lr.seq
        when 1 then 'Group discussion: the most memorable trip you''ve ever taken.'
        when 2 then 'Pair-work: give 3 pieces of health advice using "should / shouldn''t".'
        when 3 then 'Role-play: a job interview for your dream job.'
        when 4 then 'Debate: "Smartphones do more harm than good for teenagers".'
        else 'Pair-work: compare two countries you would like to visit.'
      end
  end,
  homework = case
    when lr.class_name ilike '%junior%' then
      case lr.seq
        when 1 then 'Workbook page 6, exercises 1–3. Draw your family tree.'
        when 2 then 'Workbook page 12. Label rooms in your home and bring the picture.'
        when 3 then 'Workbook page 18. Memorise 8 classroom vocabulary words.'
        when 4 then 'Write 6 sentences about your morning routine.'
        else 'Make a poster of your favourite hobby.'
      end
    else
      case lr.seq
        when 1 then 'Write a 120-word paragraph about your last holiday.'
        when 2 then 'Workbook pp 24–25. Plan a 1-week healthy meal schedule.'
        when 3 then 'Prepare a 1-minute speech about your dream job.'
        when 4 then 'Read the article on screen-time and write a short summary.'
        else 'Pick a country and prepare a 5-slide presentation.'
      end
  end,
  general_note = case
    when lr.seq = 1 then 'Most students engaged well. A few are still shy speaking aloud — to revisit.'
    when lr.seq = 2 then 'Good energy throughout. Pair-work was effective.'
    when lr.seq = 3 then 'Pace was a little fast for the second half — will slow down next time.'
    else 'Solid lesson; the new topic landed well. Continue with current pace.'
  end
from lessons_ranked lr
where l.id = lr.id;

-- --------------------------------------------------------------------------
-- 2. Per-student feedback: vary the individual notes per child per lesson
--    so it doesn't look canned. Picks one of 5 templates by hashing the
--    student id + lesson sequence.
-- --------------------------------------------------------------------------

with center_id as (
  select id from public.centers
  where name ilike 'Trung Tâm Anh Ngữ Hoa Mai' limit 1
),
ranked as (
  select
    slu.id,
    slu.behavior_rating,
    row_number() over (
      partition by slu.student_id order by l.lesson_date asc
    ) as seq,
    s.full_name as student_name
  from public.student_lesson_updates slu
  join public.lessons  l on l.id = slu.lesson_id
  join public.classes  c on c.id = l.class_id
  join public.students s on s.id = slu.student_id
  where c.center_id = (select id from center_id)
)
update public.student_lesson_updates u
set individual_note = case
  when r.behavior_rating = 'great' then
    case ((length(r.student_name) + r.seq) % 4)
      when 0 then 'Tích cực phát biểu, đọc rõ ràng, làm bài tập đầy đủ. Giữ phong độ này nhé!'
      when 1 then 'Hôm nay rất tự tin khi nói trước lớp. Phụ huynh tiếp tục khuyến khích con đọc tiếng Anh ở nhà.'
      when 2 then 'Hoàn thành xuất sắc tất cả bài tập trên lớp. Phát âm chuẩn, ghi nhớ từ vựng tốt.'
      else 'Là gương mẫu cho lớp hôm nay — tham gia hoạt động nhóm và giúp bạn cùng nhóm.'
    end
  when r.behavior_rating = 'good' then
    case ((length(r.student_name) + r.seq) % 4)
      when 0 then 'Tham gia bài học tốt. Cần luyện thêm phần phát âm các từ kết thúc bằng "s".'
      when 1 then 'Làm bài đầy đủ và nắm vững ngữ pháp. Khuyến khích con đặt câu hỏi nhiều hơn khi chưa hiểu.'
      when 2 then 'Hoạt động nhóm tích cực. Có thể luyện nghe ở nhà bằng nhạc hoặc clip ngắn.'
      else 'Tiến bộ rõ rệt so với buổi trước. Cố gắng giữ tập trung trong suốt giờ học.'
    end
  when r.behavior_rating = 'okay' then
    case ((length(r.student_name) + r.seq) % 4)
      when 0 then 'Cần luyện thêm phát âm và sự tự tin khi nói trước lớp.'
      when 1 then 'Nắm được nội dung chính nhưng chưa hoàn thành bài tập về nhà. Phụ huynh nhắc con nhé.'
      when 2 then 'Tham gia bài học nhưng còn rụt rè. Khuyến khích con phát biểu nhiều hơn ở các buổi tới.'
      else 'Có cố gắng nhưng tốc độ làm bài còn chậm. Sẽ ôn lại phần ngữ pháp tuần sau.'
    end
  else
    case ((length(r.student_name) + r.seq) % 4)
      when 0 then 'Hôm nay con mất tập trung và chưa hoàn thành bài tập. Nhờ phụ huynh trao đổi cùng con.'
      when 1 then 'Cần được hỗ trợ thêm về từ vựng cơ bản. Sẽ giao thêm bài luyện ở nhà.'
      when 2 then 'Chưa thuộc bài cũ. Đề nghị phụ huynh kiểm tra và ôn lại cùng con tối nay.'
      else 'Con có vẻ mệt và không tham gia hoạt động nhóm. Theo dõi sức khoẻ giúp con.'
    end
end
from ranked r
where u.id = r.id;
