/**
 * Demo seed — consolidated. Wipes the project and rebuilds "Trung Tâm
 * Anh Ngữ Hoa Mai", a fictional Vietnamese English center, with enough
 * depth that a sales walkthrough of /demo looks like a working business
 * rather than a hello-world.
 *
 * Single source of truth for the demo. Replaces the old split between
 * scripts/seed.ts + db/demo-enrich.sql + db/demo-seed-complete.sql —
 * those .sql files are kept for reference but no longer needed; running
 * `npm run db:seed` produces the entire demo state.
 *
 * Produces:
 *   • 1 center with contact + report customisation
 *   • 1 admin, 2 teachers, 5 parents
 *   • 2 classes (Junior A, Senior B) — both assigned to the demo teacher
 *   • 7 students across the two classes, with overall_level set
 *   • 6 worksheets pointing at placehold.co PNGs (real URLs that resolve)
 *   • 8 lessons per class going back ~6 weeks, with realistic Unit /
 *     Topic / vocab / grammar / homework / speaking activity / general
 *     note, some with worksheets attached
 *   • Per-student attendance + behavior_rating + individual_note for
 *     every lesson, varied so the parent view doesn't look canned
 *   • 4 conversation threads (one per parent), realistic Vietnamese
 *     messages — questions about homework, schedule changes, illness
 *     notification, behavior encouragement. Mix of read + unread.
 *
 * Run with: npm run db:seed
 * SAFE FOR DEV ONLY — destroys all auth users + public table rows.
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SHARED_PASSWORD = "password123";
const CENTER_NAME = "Trung Tâm Anh Ngữ Hoa Mai";

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function daysAgo(n: number): string {
  // Return YYYY-MM-DD for the date N days before today, in server-local
  // time. Matches how the app stores/reads lesson_date (date, no TZ).
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(n: number, hour = 9): string {
  // Full ISO timestamp N days ago at HH:00 local — for message created_at.
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function nuke() {
  console.log("Wiping existing data...");
  await supabase.from("audit_log").delete().not("id", "is", null);
  await supabase.from("centers").delete().not("id", "is", null);

  const all: { id: string; email?: string }[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const toDelete = all.filter(
    (u) => !u.email || !superAdminEmail.includes(u.email.toLowerCase()),
  );
  for (const u of toDelete) {
    await supabase.auth.admin.deleteUser(u.id, false);
  }
  console.log(
    `  Deleted ${toDelete.length} auth user(s); preserved ${
      all.length - toDelete.length
    } super-admin account(s).`,
  );
}

async function findExistingUserId(email: string): Promise<string | null> {
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) return null;
    const hit = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
    page++;
  }
}

async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "teacher" | "parent",
  centerId: string,
): Promise<string> {
  let { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SHARED_PASSWORD,
    email_confirm: true,
  });
  if (error?.message?.includes("already been registered")) {
    const existingId = await findExistingUserId(email);
    if (existingId) await supabase.auth.admin.deleteUser(existingId, false);
    ({ data, error } = await supabase.auth.admin.createUser({
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
    }));
  }
  if (error) throw new Error(`auth.createUser ${email}: ${error.message}`);
  const id = data.user!.id;

  const { error: profErr } = await supabase.from("users").insert({
    id,
    email,
    full_name: fullName,
    role,
    center_id: centerId,
  });
  if (profErr) throw new Error(`profile insert ${email}: ${profErr.message}`);
  return id;
}

// ----------------------------------------------------------------------
// Demo content — lesson plans for each of 8 lessons per class. Keeps the
// realism: each lesson builds on the last, vocab gets harder, homework
// references workbook pages in sequence.
// ----------------------------------------------------------------------

type LessonPlan = {
  unit: string;
  lesson_number: string;
  topic: string;
  vocabulary: string;
  grammar_point: string;
  speaking_activity: string;
  homework: string;
  general_note: string;
};

const JUNIOR_PLANS: LessonPlan[] = [
  {
    unit: "Unit 1",
    lesson_number: "Lesson 1",
    topic: "My Family",
    vocabulary: "family, mother, father, sister, brother, grandparents, aunt, uncle",
    grammar_point: "This is my … / These are my …",
    speaking_activity: "Pair-work: introduce 3 family members using a photo.",
    homework: "Workbook page 6, exercises 1–3. Draw your family tree.",
    general_note: "Most students engaged well. A few are still shy speaking aloud — to revisit.",
  },
  {
    unit: "Unit 1",
    lesson_number: "Lesson 2",
    topic: "My Home",
    vocabulary: "living room, kitchen, bedroom, bathroom, garden, balcony, sofa, table",
    grammar_point: "There is / There are — There is a sofa in the living room.",
    speaking_activity: "Describe your bedroom to a partner using 'There is/are'.",
    homework: "Workbook page 12. Label rooms in your home and bring the picture.",
    general_note: "Good energy throughout. Pair-work was effective.",
  },
  {
    unit: "Unit 2",
    lesson_number: "Lesson 3",
    topic: "At School",
    vocabulary: "classroom, teacher, student, blackboard, pencil, eraser, schoolbag",
    grammar_point: "Wh-questions: What / Where / Who",
    speaking_activity: "Role-play: a student asking the teacher for help.",
    homework: "Workbook page 18. Memorise 8 classroom vocabulary words.",
    general_note: "Pace was a little fast for the second half — will slow down next time.",
  },
  {
    unit: "Unit 2",
    lesson_number: "Lesson 4",
    topic: "Daily Routines",
    vocabulary: "wake up, brush teeth, have breakfast, go to school, do homework, sleep",
    grammar_point: "Present simple — I wake up at 6 a.m.",
    speaking_activity: "Tell your daily routine using sequence words: first, then, finally.",
    homework: "Write 6 sentences about your morning routine.",
    general_note: "Solid lesson; new vocab landed well.",
  },
  {
    unit: "Unit 3",
    lesson_number: "Lesson 5",
    topic: "Free Time",
    vocabulary: "play, watch TV, read, draw, ride a bike, listen to music, sing, dance",
    grammar_point: "Can / Can't — I can ride a bike.",
    speaking_activity: "Mini-presentation: 'Three things I love doing in my free time'.",
    homework: "Make a poster of your favourite hobby.",
    general_note: "Lớp rất sôi nổi với chủ đề sở thích.",
  },
  {
    unit: "Unit 3",
    lesson_number: "Lesson 6",
    topic: "Food and Drink",
    vocabulary: "rice, noodles, soup, fruit, milk, water, juice, breakfast, lunch, dinner",
    grammar_point: "Like / Don't like — I like noodles.",
    speaking_activity: "Pair-work: ask and answer about favourite foods.",
    homework: "Draw + label your favourite meal. Practice 5 'I like…' sentences.",
    general_note: "Vài bạn cần luyện thêm phát âm /θ/ và /ð/.",
  },
  {
    unit: "Unit 4",
    lesson_number: "Lesson 7",
    topic: "Weather and Clothes",
    vocabulary: "sunny, rainy, hot, cold, shirt, trousers, shoes, hat, umbrella, jacket",
    grammar_point: "It's + adjective — It's sunny today.",
    speaking_activity: "Group game: describe today's weather + what to wear.",
    homework: "Workbook page 28. Match clothes to weather.",
    general_note: "Hoạt động nhóm hiệu quả, học sinh dùng câu mẫu tốt.",
  },
  {
    unit: "Unit 4",
    lesson_number: "Lesson 8",
    topic: "Animals",
    vocabulary: "dog, cat, fish, bird, rabbit, hamster, turtle, parrot, farm, pet",
    grammar_point: "Has / Have — I have a dog. She has a cat.",
    speaking_activity: "Show-and-tell: present a real or imaginary pet to the class.",
    homework: "Write 8 sentences about animals using 'has' and 'have'.",
    general_note: "Cả lớp thuộc bài và hứng thú. Chuẩn bị ôn tập Unit 4.",
  },
];

const SENIOR_PLANS: LessonPlan[] = [
  {
    unit: "Unit 3",
    lesson_number: "Lesson 1",
    topic: "Travel & Holidays",
    vocabulary: "travel, suitcase, passport, beach, mountain, hotel, sightseeing, souvenir",
    grammar_point: "Past simple vs Present perfect — I went / I have been",
    speaking_activity: "Group discussion: the most memorable trip you've ever taken.",
    homework: "Write a 120-word paragraph about your last holiday.",
    general_note: "Discussion went well, most students engaged confidently.",
  },
  {
    unit: "Unit 3",
    lesson_number: "Lesson 2",
    topic: "Healthy Habits",
    vocabulary: "exercise, vegetables, fruit, water, sleep, vitamin, energy, healthy diet",
    grammar_point: "Should / Shouldn't for advice",
    speaking_activity: "Pair-work: give 3 pieces of health advice using 'should / shouldn't'.",
    homework: "Workbook pp 24–25. Plan a 1-week healthy meal schedule.",
    general_note: "Good participation. Some students struggled with /ʃ/ vs /tʃ/ — to revisit.",
  },
  {
    unit: "Unit 4",
    lesson_number: "Lesson 3",
    topic: "My Future Job",
    vocabulary: "doctor, engineer, teacher, designer, salary, interview, career, ambition",
    grammar_point: "Future plans: going to / will",
    speaking_activity: "Role-play: a job interview for your dream job.",
    homework: "Prepare a 1-minute speech about your dream job.",
    general_note: "Học sinh hứng thú với chủ đề nghề nghiệp, chuẩn bị bài tốt.",
  },
  {
    unit: "Unit 4",
    lesson_number: "Lesson 4",
    topic: "Technology in Daily Life",
    vocabulary: "smartphone, application, internet, social media, screen time, device, online",
    grammar_point: "Comparatives & superlatives — faster, the fastest",
    speaking_activity: "Debate: 'Smartphones do more harm than good for teenagers'.",
    homework: "Read the article on screen-time and write a short summary.",
    general_note: "Debate was lively. Continue practising linking words.",
  },
  {
    unit: "Unit 5",
    lesson_number: "Lesson 5",
    topic: "Around the World",
    vocabulary: "culture, tradition, language, country, capital, currency, custom, festival",
    grammar_point: "Reported speech — She said that …",
    speaking_activity: "Pair-work: compare two countries you would like to visit.",
    homework: "Pick a country and prepare a 5-slide presentation.",
    general_note: "Học sinh chuẩn bị bài rất nghiêm túc. Phát âm chuẩn hơn.",
  },
  {
    unit: "Unit 5",
    lesson_number: "Lesson 6",
    topic: "Environment & Sustainability",
    vocabulary: "pollution, recycle, climate, plastic, sustainable, waste, renewable, planet",
    grammar_point: "Conditional 1 — If we recycle, we'll reduce waste.",
    speaking_activity: "Group brainstorm: 5 actions to reduce plastic at home.",
    homework: "Write a 150-word essay on climate change in Vietnam.",
    general_note: "Tốt. Chủ đề này gắn với đời sống nên cả lớp tham gia tích cực.",
  },
  {
    unit: "Unit 6",
    lesson_number: "Lesson 7",
    topic: "Books and Films",
    vocabulary: "novel, character, plot, director, scene, review, recommend, genre",
    grammar_point: "Relative clauses — The book that I read…",
    speaking_activity: "Pair-work: recommend a book or film and explain why.",
    homework: "Write a 200-word review of a book or film you recently enjoyed.",
    general_note: "Một số học sinh chưa quen với relative clauses — ôn lại buổi sau.",
  },
  {
    unit: "Unit 6",
    lesson_number: "Lesson 8",
    topic: "Cambridge KET Practice Test",
    vocabulary: "(review of Units 3–6)",
    grammar_point: "Mixed grammar review",
    speaking_activity: "Mock KET Speaking Part 1 & 2 — pair interviews.",
    homework: "Complete KET Reading & Writing Practice Test 2 at home.",
    general_note: "Bài kiểm tra thử KET diễn ra nghiêm túc. Sẽ chữa bài chi tiết buổi tới.",
  },
];

// ----------------------------------------------------------------------
// Individual notes — per-student feedback that varies by behavior rating
// so the parent view doesn't read like every kid got the same comment.
// ----------------------------------------------------------------------

const NOTES_BY_RATING: Record<string, string[]> = {
  great: [
    "Tích cực phát biểu, đọc rõ ràng, làm bài tập đầy đủ. Giữ phong độ này nhé!",
    "Hôm nay rất tự tin khi nói trước lớp. Phụ huynh tiếp tục khuyến khích con đọc tiếng Anh ở nhà.",
    "Hoàn thành xuất sắc tất cả bài tập trên lớp. Phát âm chuẩn, ghi nhớ từ vựng tốt.",
    "Là gương mẫu cho lớp hôm nay — tham gia hoạt động nhóm và giúp bạn cùng nhóm.",
  ],
  good: [
    "Tham gia bài học tốt. Cần luyện thêm phần phát âm các từ kết thúc bằng 's'.",
    "Làm bài đầy đủ và nắm vững ngữ pháp. Khuyến khích con đặt câu hỏi nhiều hơn khi chưa hiểu.",
    "Hoạt động nhóm tích cực. Có thể luyện nghe ở nhà bằng nhạc hoặc clip ngắn.",
    "Tiến bộ rõ rệt so với buổi trước. Cố gắng giữ tập trung trong suốt giờ học.",
  ],
  okay: [
    "Cần luyện thêm phát âm và sự tự tin khi nói trước lớp.",
    "Nắm được nội dung chính nhưng chưa hoàn thành bài tập về nhà. Phụ huynh nhắc con nhé.",
    "Tham gia bài học nhưng còn rụt rè. Khuyến khích con phát biểu nhiều hơn ở các buổi tới.",
    "Có cố gắng nhưng tốc độ làm bài còn chậm. Sẽ ôn lại phần ngữ pháp tuần sau.",
  ],
  needs_attention: [
    "Hôm nay con mất tập trung và chưa hoàn thành bài tập. Nhờ phụ huynh trao đổi cùng con.",
    "Cần được hỗ trợ thêm về từ vựng cơ bản. Sẽ giao thêm bài luyện ở nhà.",
    "Chưa thuộc bài cũ. Đề nghị phụ huynh kiểm tra và ôn lại cùng con tối nay.",
    "Con có vẻ mệt và không tham gia hoạt động nhóm. Theo dõi sức khoẻ giúp con.",
  ],
};

function noteFor(rating: string, studentName: string, lessonSeq: number): string {
  const pool = NOTES_BY_RATING[rating] ?? NOTES_BY_RATING.good;
  const idx = (studentName.length + lessonSeq) % pool.length;
  return pool[idx];
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------

async function main() {
  await nuke();

  console.log("Creating center + report customisation...");
  const { data: center, error: cErr } = await supabase
    .from("centers")
    .insert({
      name: CENTER_NAME,
      contact_email: "lienhe@hoamai.test",
      contact_phone: "+84 28 1234 5678",
      subscription_status: "active",
      report_intro_text:
        "Kính gửi quý phụ huynh, báo cáo này tổng hợp tiến trình học tập gần đây của con tại Trung Tâm Anh Ngữ Hoa Mai. Mong quý phụ huynh dành thời gian xem và cùng con ôn lại nội dung đã học.",
      report_footer_text:
        "Báo cáo này có tính bảo mật và chỉ dành riêng cho phụ huynh của học sinh. Mọi thắc mắc xin liên hệ trung tâm.",
      report_show_summary: true,
      report_show_signatures: true,
      report_signature_label_left: "Giáo viên chủ nhiệm",
      report_signature_label_right: "Phụ huynh / Người giám hộ",
    })
    .select()
    .single();
  if (cErr) throw cErr;
  const centerId = center.id;

  console.log("Creating programs catalog...");
  await supabase.from("center_programs").insert([
    { center_id: centerId, label: "Cambridge KET (A2)", sort_order: 10 },
    { center_id: centerId, label: "Cambridge PET (B1)", sort_order: 20 },
    { center_id: centerId, label: "IELTS", sort_order: 30 },
    { center_id: centerId, label: "TOEIC", sort_order: 40 },
    { center_id: centerId, label: "English Communication", sort_order: 50 },
    { center_id: centerId, label: "Young Learners", sort_order: 60 },
  ]);

  console.log("Creating users...");
  void (await createUser("admin@hoamai.test", "Cô Trang", "admin", centerId));
  // Hương is the demo teacher and teaches BOTH classes (matches demo.ts).
  const huong = await createUser(
    "huong@hoamai.test",
    "Cô Linh",
    "teacher",
    centerId,
  );
  // Tú is a second teacher (no class assigned) — shows the admin can manage
  // multiple teachers, and the bench. Useful for the "assign teacher" UX.
  void (await createUser("tu@hoamai.test", "Trần Văn Tú", "teacher", centerId));

  const binh = await createUser(
    "binh@parent.test",
    "Phạm Văn Bình",
    "parent",
    centerId,
  );
  const hoa = await createUser(
    "hoa@parent.test",
    "Nguyễn Thị Hoa",
    "parent",
    centerId,
  );
  const long = await createUser(
    "long@parent.test",
    "Lê Văn Long",
    "parent",
    centerId,
  );
  const mai = await createUser(
    "mai@parent.test",
    "Trần Thị Mai",
    "parent",
    centerId,
  );
  const thu = await createUser(
    "thu@parent.test",
    "Đặng Thị Thu",
    "parent",
    centerId,
  );

  console.log("Creating classes...");
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .insert([
      {
        center_id: centerId,
        name: "Junior A",
        teacher_id: huong,
        schedule_text: "Thứ 2-4-6, 17:30-19:00",
        program: "Young Learners",
        book: "Family and Friends 2",
      },
      {
        center_id: centerId,
        name: "Senior B",
        teacher_id: huong,
        schedule_text: "Thứ 3-5-7, 18:00-19:30",
        program: "Cambridge KET (A2)",
        book: "Solutions Pre-Intermediate",
      },
    ])
    .select();
  if (clsErr) throw clsErr;
  const juniorA = classes![0].id;
  const seniorB = classes![1].id;

  console.log("Creating students...");
  const { data: students, error: sErr } = await supabase
    .from("students")
    .insert([
      // Junior A
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Phạm Minh An",
        age: 8,
        parent_user_id: binh,
        overall_level: "good",
      },
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Nguyễn Bảo Ngọc",
        age: 9,
        parent_user_id: hoa,
        overall_level: "good",
      },
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Lê Khánh Linh",
        age: 9,
        parent_user_id: long,
        overall_level: "okay",
      },
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Đặng Hồng Anh",
        age: 8,
        parent_user_id: thu,
        overall_level: "needs_attention",
      },
      // Senior B
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Lê Quang Huy",
        age: 12,
        parent_user_id: long,
        overall_level: "good",
      },
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Trần Đức Minh",
        age: 12,
        parent_user_id: mai,
        overall_level: "good",
      },
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Trần Thu Hà",
        age: 11,
        parent_user_id: mai,
        overall_level: "okay",
      },
    ])
    .select();
  if (sErr) throw sErr;
  // Junior A: An, Ngọc, Linh, Hồng Anh
  // Senior B: Huy, Minh, Hà
  const [an, ngoc, linh, hongAnh, huy, minh, ha] = students!;

  console.log("Creating worksheets...");
  // placehold.co serves real PNGs on demand — the URLs resolve in the
  // browser so a center owner clicking a worksheet sees the image (a
  // labeled placeholder), not a 404. Storage bucket is bypassed for the
  // demo since we don't need real PDFs.
  // Bundled local thumbnail (public/worksheet-thumb.svg) instead of a
  // third-party placeholder — no external requests on production.
  const ws = (name: string, ext: string = "png") => ({
    center_id: centerId,
    uploaded_by: huong,
    name,
    storage_path: `demo/${centerId}/${name.replace(/\s+/g, "_")}.${ext}`,
    public_url: "/worksheet-thumb.svg",
    file_type: ext === "pdf" ? "application/pdf" : "image/svg+xml",
    size_bytes: 245_000,
  });
  const { data: worksheets, error: wErr } = await supabase
    .from("worksheets")
    .insert([
      ws("Family Tree Worksheet"),
      ws("Daily Routines Cut-out"),
      ws("Food Vocabulary Bingo"),
      ws("KET Practice — Reading"),
      ws("Environment Crossword"),
      ws("Job Interview Role Cards"),
    ])
    .select();
  if (wErr) throw wErr;
  const [familyWs, routinesWs, foodWs, ketWs, envWs, jobWs] = worksheets!;

  // Map each lesson seq → worksheet (some lessons don't have one, which
  // is realistic — not every class hands out a worksheet).
  const juniorWorksheetBySeq: Record<number, string | null> = {
    1: familyWs.id,
    2: null,
    3: null,
    4: routinesWs.id,
    5: null,
    6: foodWs.id,
    7: null,
    8: null,
  };
  const seniorWorksheetBySeq: Record<number, string | null> = {
    1: null,
    2: null,
    3: jobWs.id,
    4: null,
    5: null,
    6: envWs.id,
    7: null,
    8: ketWs.id,
  };

  console.log("Creating lessons + per-student updates...");

  // Junior A: 8 lessons on Mon/Wed/Fri schedule going back ~6 weeks.
  // Senior B: 8 lessons on Tue/Thu/Sat schedule going back ~6 weeks.
  // Stagger so the recent-lessons table on /admin shows alternating
  // classes rather than 8 in a row from one class.
  // Recent + active: 8 lessons per class over the last ~3 weeks, the
  // newest a day ago, with 3 inside the last 7 days so the dashboard's
  // "this week" counts look healthy (no "haven't logged" warning) and
  // the parent's latest session is recent.
  const juniorDayOffsets = [22, 19, 15, 12, 8, 5, 2, 1]; // Mon/Wed/Fri-ish
  const seniorDayOffsets = [23, 20, 16, 13, 9, 6, 3, 1]; // Tue/Thu/Sat-ish

  const ratings = ["great", "good", "okay", "needs_attention"] as const;
  const attendanceRoll = ["present", "present", "present", "present", "present", "present", "present", "late", "absent"];

  const juniorStudents = [an, ngoc, linh, hongAnh];
  const seniorStudents = [huy, minh, ha];

  async function seedClassLessons(
    classId: string,
    plans: LessonPlan[],
    offsets: number[],
    worksheetBySeq: Record<number, string | null>,
    classStudents: { id: string; full_name: string }[],
  ) {
    for (let li = 0; li < plans.length; li++) {
      const plan = plans[li];
      const seq = li + 1;
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          class_id: classId,
          teacher_id: huong,
          lesson_date: daysAgo(offsets[li]),
          unit: plan.unit,
          lesson_number: plan.lesson_number,
          topic: plan.topic,
          vocabulary: plan.vocabulary,
          grammar_point: plan.grammar_point,
          speaking_activity: plan.speaking_activity,
          homework: plan.homework,
          general_note: plan.general_note,
          worksheet_id: worksheetBySeq[seq] ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const updates = classStudents.map((s, i) => {
        const rating = ratings[(li + i) % ratings.length];
        // Mostly present, occasional late/absent based on (seq, student) hash.
        const attendance =
          attendanceRoll[(li * 3 + i * 5 + s.full_name.length) % attendanceRoll.length];
        return {
          lesson_id: lesson.id,
          student_id: s.id,
          behavior_rating: rating,
          individual_note: noteFor(rating, s.full_name, seq),
          // Mostly done; one student per lesson tends to skip.
          homework_completed: !(li % 2 === 0 && i === 1) && attendance !== "absent",
          attendance,
        };
      });

      const { error: uErr } = await supabase
        .from("student_lesson_updates")
        .insert(updates);
      if (uErr) throw uErr;
    }
  }

  await seedClassLessons(juniorA, JUNIOR_PLANS, juniorDayOffsets, juniorWorksheetBySeq, juniorStudents);
  await seedClassLessons(seniorB, SENIOR_PLANS, seniorDayOffsets, seniorWorksheetBySeq, seniorStudents);

  // --------------------------------------------------------------------
  // Messages — 4 active threads, varied tone. One unread per parent so
  // the parent home shows unread badges and the admin inbox looks busy.
  // --------------------------------------------------------------------
  console.log("Creating message threads...");

  type Msg = {
    studentId: string;
    senderId: string;
    body: string;
    daysAgo: number;
    hour: number;
    unread?: boolean;
  };

  const messages: Msg[] = [
    // Thread 1 — Mai ↔ Hương about Minh (homework question + teacher reply)
    {
      studentId: minh.id,
      senderId: mai,
      body: "Chào cô Hương. Tuần này con Minh có bài tập gì không cô? Em muốn nhắc con học ạ.",
      daysAgo: 5,
      hour: 19,
    },
    {
      studentId: minh.id,
      senderId: huong,
      body: "Chào chị Mai. Tuần này con có bài Workbook trang 24-25 và lập thực đơn lành mạnh 1 tuần. Con học khá ổn, chỉ cần luyện thêm phát âm 'sh' và 'ch' thôi ạ.",
      daysAgo: 5,
      hour: 21,
    },
    {
      studentId: minh.id,
      senderId: mai,
      body: "Cảm ơn cô nhiều. Em sẽ kèm con luyện phát âm ở nhà. Con về có vẻ thích lớp lắm, hay kể chuyện đi học :)",
      daysAgo: 4,
      hour: 8,
    },
    {
      studentId: minh.id,
      senderId: huong,
      body: "Vâng, hôm nay con tham gia phần thảo luận nhóm rất tích cực. Chị khen con vài câu cho con thêm động lực nhé!",
      daysAgo: 1,
      hour: 20,
      unread: true,
    },

    // Thread 2 — Mai ↔ Hương about Hà (illness notification)
    {
      studentId: ha.id,
      senderId: mai,
      body: "Chào cô. Hôm nay con Hà bị cảm nhẹ, em cho con nghỉ một buổi để hồi phục. Em xin tài liệu buổi này để con ôn ở nhà ạ.",
      daysAgo: 8,
      hour: 12,
    },
    {
      studentId: ha.id,
      senderId: huong,
      body: "Vâng chị, em sẽ gửi qua đây nội dung Unit 3 Lesson 4. Chúc con sớm khoẻ ạ. Buổi sau quay lại em sẽ ôn lại phần con bỏ lỡ với con.",
      daysAgo: 8,
      hour: 13,
    },
    {
      studentId: ha.id,
      senderId: mai,
      body: "Cảm ơn cô rất nhiều ạ. Mai con sẽ đi học bình thường.",
      daysAgo: 7,
      hour: 18,
    },

    // Thread 3 — Hoa ↔ Hương about Ngọc (request for tougher work)
    {
      studentId: ngoc.id,
      senderId: hoa,
      body: "Chào cô. Em thấy con Ngọc làm bài về nhà khá nhanh, gần như xong trong 15-20 phút. Cô có thể giao thêm bài luyện nâng cao cho con không ạ?",
      daysAgo: 6,
      hour: 20,
    },
    {
      studentId: ngoc.id,
      senderId: huong,
      body: "Chào chị Hoa. Con Ngọc đúng là tiến độ nhanh hơn lớp một chút. Em sẽ chuẩn bị thêm bộ bài luyện ở mức Family and Friends 3 cho con, mỗi tuần một bộ. Chị giữ liên hệ qua đây nếu con có khó khăn ạ.",
      daysAgo: 5,
      hour: 9,
    },
    {
      studentId: ngoc.id,
      senderId: hoa,
      body: "Tuyệt vời ạ, cảm ơn cô.",
      daysAgo: 5,
      hour: 9,
    },
    {
      studentId: ngoc.id,
      senderId: huong,
      body: "Bộ bài đầu tiên em đã gửi qua phần Tài liệu (Worksheet). Chị tải về cho con làm trong tuần này nhé.",
      daysAgo: 2,
      hour: 16,
      unread: true,
    },

    // Thread 4 — Bình ↔ Hương about An (schedule reschedule)
    {
      studentId: an.id,
      senderId: binh,
      body: "Chào cô. Tuần sau gia đình em có việc về quê thứ Tư, con An sẽ phải nghỉ buổi đó. Có cách nào học bù không cô?",
      daysAgo: 3,
      hour: 11,
    },
    {
      studentId: an.id,
      senderId: huong,
      body: "Chào anh Bình. Anh yên tâm, em sẽ ghi chú con nghỉ phép. Nội dung buổi đó là Unit 3 Lesson 5 (chủ đề Free Time). Em sẽ ghi lại buổi học và gửi tài liệu để con xem ở nhà, hoặc anh có thể đến trao đổi với em trực tiếp buổi thứ Sáu trước giờ học 15 phút cũng được ạ.",
      daysAgo: 3,
      hour: 14,
    },
    {
      studentId: an.id,
      senderId: binh,
      body: "Cảm ơn cô. Vậy em sẽ qua sớm thứ Sáu để trao đổi với cô. Hẹn gặp cô ạ.",
      daysAgo: 2,
      hour: 9,
      unread: true,
    },
  ];

  for (const m of messages) {
    const created = isoDaysAgo(m.daysAgo, m.hour);
    const { error: mErr } = await supabase
      .from("parent_teacher_messages")
      .insert({
        center_id: centerId,
        student_id: m.studentId,
        sender_user_id: m.senderId,
        body: m.body,
        created_at: created,
        read_at: m.unread ? null : created,
      });
    if (mErr) throw mErr;
  }

  console.log("\nSeed complete!\n");
  console.log("Login at http://localhost:3000/login");
  console.log("Password for ALL accounts: " + SHARED_PASSWORD + "\n");
  console.log("  Admin:    admin@hoamai.test     (Cô Trang)");
  console.log("  Teacher:  huong@hoamai.test      (Cô Linh — teaches both classes)");
  console.log("  Teacher:  tu@hoamai.test         (Trần Văn Tú — bench, no class assigned)");
  console.log("  Parent:   binh@parent.test       (Phạm Văn Bình → An)");
  console.log("  Parent:   hoa@parent.test        (Nguyễn Thị Hoa → Ngọc)");
  console.log("  Parent:   long@parent.test       (Lê Văn Long → Linh, Huy)");
  console.log("  Parent:   mai@parent.test        (Trần Thị Mai → Minh, Hà)");
  console.log("  Parent:   thu@parent.test        (Đặng Thị Thu → Hồng Anh)");
  console.log("\nOr visit /demo for one-click role switching.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
