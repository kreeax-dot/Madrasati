import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { MessageComposer } from "@/components/messages/MessageComposer";

export default async function MessagesPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, subject, body, read_at, created_at, sender:profiles!messages_sender_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  const list = (messages as any[]) ?? [];
  const isDirector = profile.role === "director";

  let classes: { id: string; name: string }[] = [];
  let students: { id: string; full_name: string; class_id: string | null }[] = [];
  if (isDirector) {
    const [{ data: cls }, { data: st }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase
        .from("students")
        .select("id, full_name, class_id")
        .order("full_name"),
    ]);
    classes = (cls as any[]) ?? [];
    students = (st as any[]) ?? [];
  }

  return (
    <div className="space-y-5">
      <Realtime tables={["messages"]} />
      <TopBar
        subtitle={isDirector ? "Communication" : "Boîte de réception"}
        title="Messages"
      />

      {isDirector && (
        <MessageComposer classes={classes} students={students} />
      )}

      <MessagesInbox messages={list} />
    </div>
  );
}
