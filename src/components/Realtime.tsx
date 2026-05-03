"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to inserts/updates/deletes on the given Supabase tables and triggers
 * a soft `router.refresh()` whenever something changes. Mounts as a leaf component
 * so the page itself stays a server component.
 */
export function Realtime({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map((table) =>
      supabase
        .channel(`rt-${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => router.refresh(),
        )
        .subscribe(),
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [tables, router]);

  return null;
}
