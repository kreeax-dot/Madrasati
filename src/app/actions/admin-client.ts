"use server";

import { updateSchoolFeatures, setSchoolActive } from "./admin";
import type { SchoolFeatures } from "@/types/database";

export async function saveFeaturesAction(
  schoolId: string,
  features: SchoolFeatures,
) {
  await updateSchoolFeatures(schoolId, features);
}

export async function setActiveAction(schoolId: string, active: boolean) {
  await setSchoolActive(schoolId, active);
}
