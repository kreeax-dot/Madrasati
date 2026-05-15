import { MessagesSquare } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { st } from "@/lib/i18n/server";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { MessageComposer } from "@/components/messages/MessageComposer";

export default async function MessagesPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  // We resolve sender names with a separate query (instead of an embedded
  // FK join) so a renamed/missing FK constraint can never crash this page —
  // which used to render as "An error occurred in server components render".
  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("id, sender_id, subject, body, read_at, created_at")
    .order("created_at", { ascending: false });

  const rawList = (messagesRaw as any[]) ?? [];

  let senderById = new Map<string, string>();
  if (rawList.length > 0) {
    const ids = Array.from(
      new Set(rawList.map((m) => m.sender_id).filter(Boolean)),
    );
    if (ids.length > 0) {
      const { data: senders } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      (senders ?? []).forEach((s: any) => senderById.set(s.id, s.full_name));
    }
  }

  const list = rawList.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    read_at: m.read_at,
    created_at: m.created_at,
    sender: m.sender_id
      ? { full_name: senderById.get(m.sender_id) ?? "Système" }
      : null,
  }));

  const isDirector = profile.role === "director";

  let classes: { id: string; name: string }[] = [];
  let students: { id: string; full_name: string; class_id: string | null }[] = [];
  if (isDirector && profile.school_id) {
    // Admin client when service-role key is present; user client otherwise.
    let reader: any = supabase;
    if (hasServiceRoleKey()) {
      try {
        reader = createAdminClient();
      } catch {
        reader = supabase;
      }
    }
    const [clsRes, stRes] = await Promise.all([
      reader
        .from("classes")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name"),
      reader
        .from("students")
        .select("id, full_name, class_id")
        .eq("school_id", profile.school_id)
        .order("full_name"),
    ]);
    classes = (clsRes.data as any[]) ?? [];
    students = (stRes.data as any[]) ?? [];
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["messages"]} />
      <TopBar
        subtitle={
          isDirector
            ? st("page.messages.subtitle.director")
            : st("page.messages.subtitle.user")
        }
        title={st("page.messages.title")}
        icon={<MessagesSquare className="h-5 w-5" />}
        accent="from-blue-500 to-blue-700"
      />

      {isDirector && (
        <MessageComposer classes={classes} students={students} />
      )}

      <MessagesInbox messages={list} />
    </div>
  );
}
