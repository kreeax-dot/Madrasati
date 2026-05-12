"use server";

import {
  updateSchoolFeatures,
  setSchoolActive,
  reassignDirector,
  deleteOrphanDirector,
  deleteSchool,
} from "./admin";
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

export async function reassignDirectorAction(profileId: string, schoolId: string) {
  await reassignDirector(profileId, schoolId);
}

export async function deleteOrphanDirectorAction(profileId: string) {
  await deleteOrphanDirector(profileId);
}

export async function deleteSchoolAction(schoolId: string) {
  await deleteSchool(schoolId);
}
