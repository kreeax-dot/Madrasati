"use client";

import { useTransition } from "react";
import { assignStudentToClass } from "@/app/actions/director";

export function ClassAssigner({
  studentId,
  classId,
  classes,
}: {
  studentId: string;
  classId: string | null;
  classes: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    startTransition(async () => {
      await assignStudentToClass(studentId, value);
    });
  }

  return (
    <select
      defaultValue={classId ?? ""}
      onChange={onChange}
      disabled={pending}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
    >
      <option value="">—</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
