/**
 * Seed script: wipes the Supabase project and inserts a fake Vietnamese
 * English center with admin / teachers / parents / students / lessons.
 *
 * Run with: npm run db:seed
 *
 * SAFE FOR DEV ONLY — destroys all auth users + all rows in public tables.
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

async function nuke() {
  console.log("Wiping existing data...");
  await supabase.from("audit_log").delete().not("id", "is", null);
  await supabase.from("centers").delete().not("id", "is", null);

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  for (const u of data.users) {
    await supabase.auth.admin.deleteUser(u.id);
  }
  console.log(`  Deleted ${data.users.length} auth user(s).`);
}

async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "teacher" | "parent",
  centerId: string,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SHARED_PASSWORD,
    email_confirm: true,
  });
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

async function main() {
  await nuke();

  console.log("Creating center...");
  const { data: center, error: cErr } = await supabase
    .from("centers")
    .insert({
      name: "Trung Tâm Anh Ngữ Hoa Mai",
      contact_email: "info@hoamai.test",
      contact_phone: "+84 28 1234 5678",
      subscription_status: "active",
    })
    .select()
    .single();
  if (cErr) throw cErr;
  const centerId = center.id;

  console.log("Creating users...");
  const adminId = await createUser(
    "admin@hoamai.test",
    "Nguyễn Thị Lan",
    "admin",
    centerId,
  );
  const tu = await createUser(
    "tu@hoamai.test",
    "Trần Văn Tú",
    "teacher",
    centerId,
  );
  const huong = await createUser(
    "huong@hoamai.test",
    "Lê Thị Hương",
    "teacher",
    centerId,
  );
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

  console.log("Creating classes...");
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .insert([
      {
        center_id: centerId,
        name: "Lớp Junior A",
        teacher_id: tu,
        schedule_text: "Thứ 2-4-6, 17:30-19:00",
      },
      {
        center_id: centerId,
        name: "Lớp Senior B",
        teacher_id: huong,
        schedule_text: "Thứ 3-5-7, 18:00-19:30",
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
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Phạm Minh An",
        age: 8,
        parent_user_id: binh,
      },
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Nguyễn Bảo Ngọc",
        age: 10,
        parent_user_id: hoa,
      },
      {
        center_id: centerId,
        class_id: juniorA,
        full_name: "Lê Khánh Linh",
        age: 9,
        parent_user_id: long,
      },
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Lê Quang Huy",
        age: 11,
        parent_user_id: long,
      },
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Trần Đức Minh",
        age: 12,
        parent_user_id: mai,
      },
      {
        center_id: centerId,
        class_id: seniorB,
        full_name: "Trần Thu Hà",
        age: 11,
        parent_user_id: mai,
      },
    ])
    .select();
  if (sErr) throw sErr;
  const [an, ngoc, linh, huy, minh, ha] = students!;

  console.log("Creating lessons + per-student updates...");
  const ratings = ["great", "good", "okay", "needs_attention"] as const;

  type LessonSeed = {
    class_id: string;
    teacher_id: string;
    lesson_date: string;
    vocabulary: string;
    grammar_point: string;
    speaking_activity: string;
    homework: string;
    general_note: string;
    studentIds: string[];
  };

  const lessonsData: LessonSeed[] = [
    {
      class_id: juniorA,
      teacher_id: tu,
      lesson_date: "2026-04-22",
      vocabulary: "family, mother, father, sister, brother",
      grammar_point: "have/has — I have a sister.",
      speaking_activity: "Introduce your family in 30 seconds.",
      homework: "Workbook page 14, exercises 1-3.",
      general_note:
        "Cả lớp tham gia tích cực, đặc biệt phần giới thiệu gia đình.",
      studentIds: [an.id, ngoc.id, linh.id],
    },
    {
      class_id: juniorA,
      teacher_id: tu,
      lesson_date: "2026-04-24",
      vocabulary: "happy, sad, angry, tired, excited",
      grammar_point: "How are you feeling? — I am ___.",
      speaking_activity: "Pair-work: ask and answer about feelings.",
      homework: "Vẽ và viết về cảm xúc hôm nay.",
      general_note: "Một số bạn còn nhút nhát, cần thêm động viên.",
      studentIds: [an.id, ngoc.id, linh.id],
    },
    {
      class_id: juniorA,
      teacher_id: tu,
      lesson_date: "2026-04-26",
      vocabulary: "morning, afternoon, evening, night",
      grammar_point: "What time is it? — It is ___.",
      speaking_activity: "Role-play: telling time at the bus stop.",
      homework: "Workbook page 18.",
      general_note: "Lớp nắm bài tốt, sẵn sàng cho bài kiểm tra tuần sau.",
      studentIds: [an.id, ngoc.id, linh.id],
    },
    {
      class_id: seniorB,
      teacher_id: huong,
      lesson_date: "2026-04-23",
      vocabulary: "environment, pollution, recycle, plastic, climate",
      grammar_point: "Present perfect — Have you ever ___?",
      speaking_activity: "Group discussion: how can we reduce plastic use?",
      homework: "Write 100 words about saving the environment.",
      general_note: "Học sinh thảo luận sôi nổi.",
      studentIds: [huy.id, minh.id, ha.id],
    },
    {
      class_id: seniorB,
      teacher_id: huong,
      lesson_date: "2026-04-25",
      vocabulary: "achievement, goal, challenge, succeed, fail",
      grammar_point: "Used to vs. would (past habits).",
      speaking_activity: "Tell about a goal you achieved last year.",
      homework: "Đọc bài đọc trang 32 và trả lời câu hỏi.",
      general_note: "Cần luyện thêm phát âm 'ed' ending.",
      studentIds: [huy.id, minh.id, ha.id],
    },
    {
      class_id: seniorB,
      teacher_id: huong,
      lesson_date: "2026-04-27",
      vocabulary: "tradition, festival, custom, celebrate, ceremony",
      grammar_point: "Reported speech — She said that ___.",
      speaking_activity: "Describe a Vietnamese festival to a foreign visitor.",
      homework: "Workbook page 24.",
      general_note: "Bài học gắn với văn hóa Việt giúp học sinh tự tin hơn.",
      studentIds: [huy.id, minh.id, ha.id],
    },
  ];

  for (let li = 0; li < lessonsData.length; li++) {
    const { studentIds, ...lessonRow } = lessonsData[li];
    const { data: createdLesson, error } = await supabase
      .from("lessons")
      .insert(lessonRow)
      .select()
      .single();
    if (error) throw error;

    const updates = studentIds.map((sid, i) => ({
      lesson_id: createdLesson.id,
      student_id: sid,
      behavior_rating: ratings[(li + i) % ratings.length],
      individual_note:
        i === 0
          ? "Tham gia tích cực, phát biểu nhiều."
          : i === 1
            ? "Cần luyện thêm phát âm và sự tự tin."
            : "Tiến bộ rõ rệt so với buổi trước.",
      homework_completed: !(li % 2 === 0 && i === 1),
    }));

    const { error: uErr } = await supabase
      .from("student_lesson_updates")
      .insert(updates);
    if (uErr) throw uErr;
  }

  void adminId;

  console.log("\nSeed complete!\n");
  console.log("Login at http://localhost:3000/login");
  console.log("Password for ALL accounts: " + SHARED_PASSWORD + "\n");
  console.log("  Admin:    admin@hoamai.test     (Nguyễn Thị Lan)");
  console.log("  Teacher:  tu@hoamai.test         (Trần Văn Tú)");
  console.log("  Teacher:  huong@hoamai.test      (Lê Thị Hương)");
  console.log("  Parent:   binh@parent.test       (Phạm Văn Bình → An)");
  console.log("  Parent:   hoa@parent.test        (Nguyễn Thị Hoa → Ngọc)");
  console.log("  Parent:   long@parent.test       (Lê Văn Long → Linh, Huy)");
  console.log("  Parent:   mai@parent.test        (Trần Thị Mai → Minh, Hà)");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
