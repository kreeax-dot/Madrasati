"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { generateCode } from "@/lib/codes";

// ─── CLASSES ──────────────────────────────────────────────────────────────────
export async function createClass(formData: FormData) {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim() || null;
  if (!name) throw new Error("Nom requis");

  const { error } = await supabase
    .from("classes")
    .insert({ school_id: schoolId, name, level });
  if (error) throw new Error(error.message);

  revalidatePath("/classes");
  redirect("/classes");
}

export async function deleteClass(classId: string) {
  await getSchoolId();
  const supabase = createClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw new Error(error.message);
  revalidatePath("/classes");
}

async function getSchoolId() {
  const { profile } = await requireRole(["director"]);
  if (!profile.school_id) throw new Error("Aucune école assignée");
  return profile.school_id;
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export async function createStudent(formData: FormData): Promise<{
  studentId: string;
  code: string;
}> {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const dob = String(formData.get("date_of_birth") ?? "") || null;
  const classId = String(formData.get("class_id") ?? "") || null;
  if (!fullName) throw new Error("Nom requis");

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: schoolId,
      full_name: fullName,
      class_id: classId,
      date_of_birth: dob,
    })
    .select("id")
    .single();
  if (error || !student) throw new Error(error?.message ?? "Erreur");

  // Generate a unique code (retry on collision; 7 chars from 31-char alphabet → ~27 billion possibilities).
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode(7);
    const { error: codeErr } = await supabase.from("student_codes").insert({
      code,
      student_id: student.id,
      school_id: schoolId,
    });
    if (!codeErr) break;
    if (attempt === 4) throw new Error("Impossible de générer un code unique");
  }

  revalidatePath("/students");
  return { studentId: student.id, code };
}

export async function regenerateStudentCode(studentId: string): Promise<string> {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  // Invalidate any active codes for this student.
  await supabase
    .from("student_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .is("used_at", null);

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode(7);
    const { error } = await supabase.from("student_codes").insert({
      code,
      student_id: studentId,
      school_id: schoolId,
    });
    if (!error) break;
    if (attempt === 4) throw new Error("Impossible de générer un code unique");
  }
  revalidatePath(`/students/${studentId}`);
  return code;
}

export async function assignStudentToClass(studentId: string, classId: string | null) {
  await getSchoolId();
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update({ class_id: classId })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath("/students");
}

// ─── SCHEDULES ────────────────────────────────────────────────────────────────
export async function createSchedule(formData: FormData) {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  const classId = String(formData.get("class_id") ?? "");
  const day = Number(formData.get("day_of_week") ?? -1);
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const teacher = String(formData.get("teacher") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;

  if (!classId) throw new Error("Classe requise");
  if (day < 0 || day > 6) throw new Error("Jour invalide");
  if (!start || !end) throw new Error("Horaires requis");
  if (!subject) throw new Error("Matière requise");

  const { error } = await supabase.from("schedules").insert({
    school_id: schoolId,
    class_id: classId,
    day_of_week: day,
    start_time: start,
    end_time: end,
    subject,
    teacher,
    room,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/schedule");
}

export async function deleteSchedule(scheduleId: string) {
  await getSchoolId();
  const supabase = createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

// ─── HOMEWORK (class-based) ───────────────────────────────────────────────────
export async function createHomework(formData: FormData) {
  const schoolId = await getSchoolId();
  const supabase = createClient();
  const { profile } = await requireRole(["director"]);

  const classId = String(formData.get("class_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "");

  if (!classId || !subject || !title || !dueDate) {
    throw new Error("Champs requis");
  }

  const { error } = await supabase.from("homework").insert({
    school_id: schoolId,
    class_id: classId,
    subject,
    title,
    description,
    due_date: dueDate,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/homework");
}

export async function deleteHomework(id: string) {
  await getSchoolId();
  const supabase = createClient();
  const { error } = await supabase.from("homework").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/homework");
}

// ─── ABSENCES ─────────────────────────────────────────────────────────────────
export async function createAbsence(formData: FormData) {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const justified = formData.get("justified") === "on";

  if (!studentId || !date) throw new Error("Champs requis");

  const { error } = await supabase.from("absences").insert({
    school_id: schoolId,
    student_id: studentId,
    date,
    reason,
    justified,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/absences");
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function createPayment(formData: FormData) {
  const schoolId = await getSchoolId();
  const supabase = createClient();

  const studentId = String(formData.get("student_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("due_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!studentId || !amount || !dueDate || !description) {
    throw new Error("Champs requis");
  }

  const { error } = await supabase.from("payments").insert({
    school_id: schoolId,
    student_id: studentId,
    amount,
    due_date: dueDate,
    description,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/payments");
}

export async function markPaymentPaid(paymentId: string) {
  await getSchoolId();
  const supabase = createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath("/payments");
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export async function sendMessage(formData: FormData) {
  const { profile } = await requireRole(["director", "parent", "student"]);
  if (!profile.school_id) throw new Error("Aucune école assignée");
  const supabase = createClient();

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const recipientId = String(formData.get("recipient_id") ?? "") || null;

  if (!subject || !body) throw new Error("Champs requis");

  const { error } = await supabase.from("messages").insert({
    school_id: profile.school_id,
    sender_id: profile.id,
    recipient_id: recipientId,
    subject,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/messages");
}
