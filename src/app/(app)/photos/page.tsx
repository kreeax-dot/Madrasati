import { TopBar } from "@/components/nav/TopBar";
import { Realtime } from "@/components/Realtime";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PhotoUploader } from "@/components/director/PhotoUploader";
import { PhotosGallery } from "@/components/PhotosGallery";

export default async function PhotosPage() {
  const { profile } = await requireRole(["director", "parent", "student"]);
  const supabase = createClient();
  const isDirector = profile.role === "director";

  const [{ data: classes }, { data: students }, { data: photos }] = await Promise.all([
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("students").select("id, full_name").order("full_name"),
    supabase
      .from("photos")
      .select(
        "id, url, caption, class_id, student_id, created_at, classes(name), students(full_name)",
      )
      .order("created_at", { ascending: false }),
  ]);

  const all = (photos as any[]) ?? [];
  const classPhotos = all.filter((p) => p.class_id);
  const individualPhotos = all.filter((p) => p.student_id);

  return (
    <div className="space-y-5">
      <Realtime tables={["photos"]} />
      <TopBar subtitle="Galerie" title="Photos" />

      {isDirector && (
        <PhotoUploader
          classes={(classes as any[]) ?? []}
          students={(students as any[]) ?? []}
        />
      )}

      <PhotosGallery
        classPhotos={classPhotos}
        individualPhotos={individualPhotos}
        canDelete={isDirector}
      />
    </div>
  );
}
