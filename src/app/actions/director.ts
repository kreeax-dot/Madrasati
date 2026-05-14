"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { generateCode } from "@/lib/codes";

/**
 * Returns the best available writer client for a director-side action.
 *
 * If the SUPABASE_SERVICE_ROLE_KEY env var is configured (recommended), we
 * use the admin client — which bypasses RLS and immunises director writes
 * against any RLS / current_school_id drift. Role + school have already
 * been verified by `requireRole + getSchoolId` upstream of every caller.
 *
 * If the key is missing, we fall back to the user-scoped client so writes
 * still work via the RLS policies (defense in depth). Better than crashing
 * with "SUPABASE_SERVICE_ROLE_KEY is missing".
 */
function adminWriter() {
  if (hasServiceRoleKey()) {
    try {
      return createAdminClient();
    } catch (err) {
      console.warn(
        "[adminWriter] admin client construction failed, falling back to user client:",
        err,
      );
    }
  }
  return createClient();
}

// ─── CLASSES ──────────────────────────────────────────────────────────────────
export async function createClass(formData: FormData) {
  const schoolId = await getSchoolId();

  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim() || null;
  if (!name) throw new Error("Nom requis");

  const { error } = await adminWriter()
    .from("classes")
    .insert({ school_id: schoolId, name, level });
  if (error) throw new Error(error.message);

  revalidatePath("/classes");
  redirect("/classes");
}

export async function deleteClass(classId: string) {
  const schoolId = await getSchoolId();
  const admin = adminWriter();

  // Unassign students from the class so they are not lost (class_id is ON DELETE
  // SET NULL via FK, but we do it explicitly to keep things obvious + revalidate).
  const { error: unassignErr } = await admin
    .from("students")
    .update({ class_id: null })
    .eq("class_id", classId)
    .eq("school_id", schoolId);
  if (unassignErr) {
    throw new Error(`Impossible de détacher les élèves : ${unassignErr.message}`);
  }

  // schedules / homework / exams cascade via FK on delete.
  const { error } = await admin
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("school_id", schoolId);
  if (error) throw new Error(`Suppression refusée : ${error.message}`);

  revalidatePath("/classes");
  revalidatePath("/students");
  revalidatePath("/schedule");
  revalidatePath("/homework");
  revalidatePath("/exams");
}

async function getSchoolId() {
  const { profile } = await requireRole(["director"]);
  if (!profile.school_id) throw new Error("Aucune école assignée");
  return profile.school_id;
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
/**
 * createStudent — fully decoupled from the avatar pipeline.
 *
 * Contract:
 *   - Phase 1 inserts the student row with ONLY the columns that have
 *     always existed (school_id, full_name, class_id, date_of_birth).
 *   - Phase 2 inserts the signup code (separate table).
 *   - Phase 3 (best-effort) uploads the avatar and UPDATEs the student.
 *     If the avatar_url column doesn't exist (PGRST204), if the upload
 *     fails, if storage isn't configured — none of that can prevent
 *     student creation. We log and move on.
 *
 * Action never throws — always returns a discriminated result.
 */
export type CreateStudentResult =
  | { ok: true; studentId: string; code: string }
  | {
      ok: false;
      error: string;
      step: string;
      details?: Record<string, unknown>;
    };

export async function createStudent(
  formData: FormData,
): Promise<CreateStudentResult> {
  let step = "init";
  try {
    step = "auth";
    const { profile } = await requireRole(["director"]);
    if (!profile.school_id) {
      return {
        ok: false,
        error: "Votre compte n'est associé à aucune école.",
        step,
        details: { profileId: profile.id, role: profile.role },
      };
    }
    const schoolId = profile.school_id;

    step = "parse";
    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const dob = String(formData.get("date_of_birth") ?? "") || null;
    const classId = String(formData.get("class_id") ?? "") || null;
    if (!fullName) {
      return { ok: false, error: "Nom requis", step };
    }

    step = "client";
    const supabase = createClient();

    // ─── PHASE 1 — insert with always-present columns only ──────────────
    step = "insert_student";
    const insertPayload = {
      school_id: schoolId,
      full_name: fullName,
      class_id: classId,
      date_of_birth: dob,
    };
    console.log("[createStudent] inserting:", insertPayload);

    const { data: student, error: insertError } = await supabase
      .from("students")
      .insert(insertPayload)
      .select("id, school_id, full_name")
      .single();

    if (insertError) {
      console.error("[createStudent] INSERT FAILED", {
        message: insertError.message,
        code: (insertError as any).code,
        details: (insertError as any).details,
        hint: (insertError as any).hint,
        payload: insertPayload,
      });
      return {
        ok: false,
        error: insertError.message,
        step,
        details: {
          code: (insertError as any).code,
          hint: (insertError as any).hint,
          pgDetails: (insertError as any).details,
          payload: insertPayload,
        },
      };
    }
    if (!student) {
      return {
        ok: false,
        error: "Insertion renvoyée sans données.",
        step,
        details: { payload: insertPayload },
      };
    }

    // ─── PHASE 2 — signup code ──────────────────────────────────────────
    step = "insert_code";
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode(7);
      const { error: codeErr } = await supabase.from("student_codes").insert({
        code,
        student_id: student.id,
        school_id: schoolId,
      });
      if (!codeErr) break;
      if (attempt === 4) {
        console.error("[createStudent] student_codes insert failed", codeErr);
        revalidatePath("/students");
        revalidatePath("/dashboard");
        return {
          ok: false,
          error: `Élève créé mais code non généré : ${codeErr.message}`,
          step,
          details: {
            code: (codeErr as any).code,
            hint: (codeErr as any).hint,
            studentId: student.id,
          },
        };
      }
    }

    // ─── PHASE 3 — avatar (best-effort, NEVER fatal) ────────────────────
    step = "avatar";
    await maybeAttachAvatar(supabase, schoolId, student.id, formData);

    step = "revalidate";
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { ok: true, studentId: student.id, code };
  } catch (err: any) {
    console.error("[createStudent] UNCAUGHT", {
      step,
      message: err?.message,
      stack: err?.stack,
      raw: err,
    });
    return {
      ok: false,
      error: err?.message ?? "Erreur inconnue",
      step,
      details: { stack: err?.stack },
    };
  }
}

/**
 * Best-effort avatar attachment. NEVER throws.
 *
 *   1. If no file was picked → return immediately.
 *   2. Upload to storage. Failure → log + return.
 *   3. UPDATE the student row with `avatar_url`. If the column is missing
 *      (PGRST204 — schema not migrated yet) → log a hint that
 *      migration_v8.sql needs to be applied; otherwise log the message.
 */
async function maybeAttachAvatar(
  supabase: ReturnType<typeof createClient>,
  schoolId: string,
  studentId: string,
  formData: FormData,
): Promise<void> {
  const avatarFile = formData.get("avatar") as File | null;
  if (
    !avatarFile ||
    typeof avatarFile !== "object" ||
    !("size" in avatarFile) ||
    avatarFile.size === 0
  ) {
    return;
  }

  let url: string;
  try {
    url = await uploadToBucket(supabase, "avatars", schoolId, avatarFile);
  } catch (err: any) {
    console.warn(
      "[createStudent] avatar upload failed (non-fatal):",
      err?.message ?? err,
    );
    return;
  }

  const { error } = await supabase
    .from("students")
    .update({ avatar_url: url })
    .eq("id", studentId);
  if (error) {
    if ((error as any).code === "PGRST204") {
      console.warn(
        "[createStudent] students.avatar_url column missing. Apply supabase/migration_v8.sql in Supabase to enable student photos. The student row itself was created successfully.",
      );
    } else {
      console.warn(
        "[createStudent] avatar UPDATE failed (non-fatal):",
        error.message,
      );
    }
  }
}

export async function regenerateStudentCode(studentId: string): Promise<string> {
  const schoolId = await getSchoolId();
  const admin = adminWriter();

  // Invalidate any active codes for this student.
  await admin
    .from("student_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .is("used_at", null);

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode(7);
    const { error } = await admin.from("student_codes").insert({
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
  const { error } = await adminWriter()
    .from("students")
    .update({ class_id: classId })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath("/students");
}

// ─── SCHEDULES ────────────────────────────────────────────────────────────────
export async function createSchedule(formData: FormData) {
  const schoolId = await getSchoolId();

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

  const { error } = await adminWriter().from("schedules").insert({
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
  const { error } = await adminWriter()
    .from("schedules")
    .delete()
    .eq("id", scheduleId);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

// ─── HOMEWORK (class-based) ───────────────────────────────────────────────────
export async function createHomework(formData: FormData) {
  const schoolId = await getSchoolId();
  const { profile } = await requireRole(["director"]);

  const classId = String(formData.get("class_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "");

  if (!classId || !subject || !title || !dueDate) {
    throw new Error("Champs requis");
  }

  const { error } = await adminWriter().from("homework").insert({
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
  const { error } = await adminWriter().from("homework").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/homework");
}

// ─── ABSENCES ─────────────────────────────────────────────────────────────────
export async function createAbsence(formData: FormData) {
  const schoolId = await getSchoolId();

  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const justified = formData.get("justified") === "on";

  if (!studentId || !date) throw new Error("Champs requis");

  const { error } = await adminWriter().from("absences").insert({
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

  const studentId = String(formData.get("student_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("due_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const alreadyPaid =
    formData.get("already_paid") === "on" || formData.get("already_paid") === "true";

  if (!studentId || !amount || !dueDate || !description) {
    throw new Error("Champs requis");
  }
  if (amount <= 0) throw new Error("Montant invalide");

  const row: Record<string, any> = {
    school_id: schoolId,
    student_id: studentId,
    amount,
    due_date: dueDate,
    description,
    status: alreadyPaid ? "paid" : "pending",
  };
  if (alreadyPaid) row.paid_at = new Date().toISOString();

  const { error } = await adminWriter().from("payments").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
}

export async function markPaymentPaid(paymentId: string) {
  await getSchoolId();
  const { error } = await adminWriter()
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath("/payments");
}

// ─── STUDENT AVATAR ───────────────────────────────────────────────────────────
export async function updateStudentAvatar(formData: FormData) {
  const schoolId = await getSchoolId();
  const admin = adminWriter();

  const studentId = String(formData.get("student_id") ?? "");
  const file = formData.get("avatar") as File | null;
  if (!studentId) throw new Error("Élève requis");
  if (!file || !("size" in file) || file.size === 0) throw new Error("Image requise");

  const url = await uploadToBucket(admin, "avatars", schoolId, file);

  const { error } = await admin
    .from("students")
    .update({ avatar_url: url })
    .eq("id", studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/dashboard");
}

export async function removeStudentAvatar(studentId: string) {
  await getSchoolId();
  const { error } = await adminWriter()
    .from("students")
    .update({ avatar_url: null })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/dashboard");
}

// ─── REMEDIALS (RATTRAPAGES) ──────────────────────────────────────────────────
export async function createRemedial(formData: FormData) {
  const schoolId = await getSchoolId();
  const { profile } = await requireRole(["director"]);

  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("session_date") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!studentId || !date) throw new Error("Champs requis");
  if (!duration || duration <= 0) throw new Error("Durée invalide");

  const { error } = await adminWriter().from("remedials").insert({
    school_id: schoolId,
    student_id: studentId,
    session_date: date,
    duration_minutes: duration,
    reason,
    created_by: profile.id,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("does not exist")) {
      throw new Error(
        "Migration manquante : appliquez supabase/migration_v7.sql dans Supabase.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/remedials");
  revalidatePath(`/students/${studentId}`);
}

export async function deleteRemedial(id: string) {
  await getSchoolId();
  const { error } = await adminWriter().from("remedials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/remedials");
}

// ─── EXAMS ────────────────────────────────────────────────────────────────────
export async function createExam(formData: FormData) {
  const schoolId = await getSchoolId();
  const { profile } = await requireRole(["director"]);

  const classId = String(formData.get("class_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const examDate = String(formData.get("exam_date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!classId || !subject || !examDate) throw new Error("Champs requis");

  const { error } = await adminWriter().from("exams").insert({
    school_id: schoolId,
    class_id: classId,
    subject,
    exam_date: examDate,
    description,
    created_by: profile.id,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("does not exist")) {
      throw new Error(
        "Migration manquante : appliquez supabase/migration_v7.sql dans Supabase.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/exams");
}

export async function deleteExam(id: string) {
  await getSchoolId();
  const { error } = await adminWriter().from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/exams");
}

// ─── PHOTOS (class or individual) ─────────────────────────────────────────────
export async function uploadPhoto(formData: FormData) {
  const schoolId = await getSchoolId();
  const { profile } = await requireRole(["director"]);
  const admin = adminWriter();

  const scope = String(formData.get("scope") ?? "");
  const classId = String(formData.get("class_id") ?? "") || null;
  const studentId = String(formData.get("student_id") ?? "") || null;
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const file = formData.get("photo") as File | null;

  if (!file || !("size" in file) || file.size === 0) throw new Error("Image requise");
  if (scope === "class" && !classId) throw new Error("Classe requise");
  if (scope === "individual" && !studentId) throw new Error("Élève requis");

  const url = await uploadToBucket(admin, "photos", schoolId, file);

  const { error } = await admin.from("photos").insert({
    school_id: schoolId,
    class_id: scope === "class" ? classId : null,
    student_id: scope === "individual" ? studentId : null,
    url,
    caption,
    uploaded_by: profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/photos");
}

export async function deletePhoto(id: string) {
  await getSchoolId();
  const { error } = await adminWriter().from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/photos");
}

// ─── STORAGE HELPER ───────────────────────────────────────────────────────────
// Takes either the user-scoped or admin client. createStudent passes the
// admin client; uploadPhoto / updateStudentAvatar pass the user client (which
// hits the storage RLS policies installed in migration_v7).
async function uploadToBucket(
  client: { storage: any },
  bucket: "avatars" | "photos",
  schoolId: string,
  file: File,
): Promise<string> {
  const rawName = (file as any).name as string | undefined;
  const ext = rawName && rawName.includes(".")
    ? rawName.split(".").pop()!.toLowerCase()
    : "jpg";
  const safeExt = /^(jpe?g|png|webp|gif|avif|heic)$/i.test(ext) ? ext : "jpg";
  const key = `${schoolId}/${crypto.randomUUID()}.${safeExt}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await client.storage
    .from(bucket)
    .upload(key, buffer, {
      contentType: file.type || `image/${safeExt}`,
      upsert: false,
    });
  if (error) {
    throw new Error(`Échec téléversement (${bucket}) : ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export async function sendMessage(formData: FormData) {
  const { profile } = await requireRole(["director", "parent", "student"]);
  if (!profile.school_id) throw new Error("Aucune école assignée");
  const admin = adminWriter();

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) throw new Error("Sujet et message requis");

  const scope = String(formData.get("scope") ?? "student");
  const studentId = String(formData.get("student_id") ?? "") || null;
  const classId = String(formData.get("class_id") ?? "") || null;

  const recipients = await resolveRecipients(admin, profile.school_id, {
    scope,
    studentId,
    classId,
  });

  const finalRecipients = Array.from(new Set(recipients)).filter(
    (id) => id && id !== profile.id,
  );

  if (finalRecipients.length === 0 && scope !== "broadcast") {
    throw new Error(
      "Aucun destinataire trouvé. L'élève ou sa famille doit avoir un compte (code de connexion utilisé).",
    );
  }

  const rows =
    finalRecipients.length > 0
      ? finalRecipients.map((rid) => ({
          school_id: profile.school_id!,
          sender_id: profile.id,
          recipient_id: rid,
          subject,
          body,
        }))
      : [
          {
            school_id: profile.school_id!,
            sender_id: profile.id,
            recipient_id: null,
            subject,
            body,
          },
        ];

  const { error } = await admin.from("messages").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/messages");
}

async function resolveRecipients(
  client: any,
  schoolId: string,
  opts: { scope: string; studentId: string | null; classId: string | null },
): Promise<string[]> {
  if (opts.scope === "broadcast") return [];

  let studentIds: string[] = [];
  if (opts.scope === "student" && opts.studentId) {
    studentIds = [opts.studentId];
  } else if (opts.scope === "class" && opts.classId) {
    const { data: kids } = await client
      .from("students")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_id", opts.classId);
    studentIds = (kids ?? []).map((k: any) => k.id);
  }

  if (studentIds.length === 0) return [];

  // Pull students once for parent_id, then profiles linked via student_id.
  const [{ data: students }, { data: linkedProfiles }] = await Promise.all([
    client
      .from("students")
      .select("id, parent_id")
      .in("id", studentIds),
    client
      .from("profiles")
      .select("id, student_id")
      .in("student_id", studentIds),
  ]);

  const recipients: string[] = [];
  (students ?? []).forEach((s: any) => {
    if (s.parent_id) recipients.push(s.parent_id);
  });
  (linkedProfiles ?? []).forEach((p: any) => {
    recipients.push(p.id);
  });
  return recipients;
}

export async function markMessageRead(messageId: string) {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const { error } = await adminWriter()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

/**
 * Marks every still-unread message addressed to the current user as read.
 * Called by the bell's "Tout marquer comme lu" footer button — actually
 * clears the unread badge in DB, not just localStorage.
 */
export async function markAllNotificationsRead() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const { error } = await adminWriter()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  if (error) {
    // Non-fatal — the localStorage lastSeen will still hide them client-side.
    console.warn("[markAllNotificationsRead]", error);
  }
  revalidatePath("/messages");
  revalidatePath("/dashboard");
}
