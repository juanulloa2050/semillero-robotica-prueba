import type { CandidateProfile } from "@/lib/types";

export const UNISABANA_EMAIL_DOMAIN = "@unisabana.edu.co";
export const UNISABANA_EMAIL_PATTERN =
  String.raw`[^@\s]+@[uU][nN][iI][sS][aA][bB][aA][nN][aA]\.[eE][dD][uU]\.[cC][oO]`;

export const PROGRAM_OPTIONS = [
  "Ingeniería Mecánica",
  "Ingeniería Informática",
  "Ingeniería en Diseño e Innovación",
  "Ingeniería en Ciencia de Datos",
  "Ingeniería en Inteligencia Artificial",
] as const;

export const MIN_SEMESTER = 2;
export const MIN_CUMULATIVE_AVERAGE = 3.8;
export const MIN_ALLOWED_CUMULATIVE_AVERAGE = 3.81;
export const MAX_CUMULATIVE_AVERAGE = 5;

const UNISABANA_EMAIL_REGEX = new RegExp(`^(?:${UNISABANA_EMAIL_PATTERN})$`);

export function isUnisabanaEmail(value: string): boolean {
  return UNISABANA_EMAIL_REGEX.test(value.trim());
}

export function isAllowedProgram(value: string): boolean {
  return PROGRAM_OPTIONS.some((program) => program === value);
}

export function isValidSemester(value: string): boolean {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return false;

  const semester = Number(normalized);
  return Number.isSafeInteger(semester) && semester >= MIN_SEMESTER;
}

export function isValidCumulativeAverage(value: string): boolean {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return false;

  const average = Number(normalized);
  return (
    Number.isFinite(average) &&
    average > MIN_CUMULATIVE_AVERAGE &&
    average <= MAX_CUMULATIVE_AVERAGE
  );
}

export function isValidCandidateProfile(profile: CandidateProfile): boolean {
  return Boolean(
    profile.fullName.trim() &&
      isUnisabanaEmail(profile.email) &&
      isAllowedProgram(profile.program) &&
      isValidSemester(profile.semester) &&
      isValidCumulativeAverage(profile.cumulativeAverage) &&
      profile.consentData &&
      profile.consentFiles
  );
}
