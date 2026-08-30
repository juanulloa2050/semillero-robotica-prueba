import type { AppState, CandidateProfile } from "@/lib/types";
import { isValidCandidateProfile } from "@/lib/admissions";

export type JourneyStage =
  | "new"
  | "registration"
  | "introduction"
  | "skills"
  | "submitted";

export interface JourneyDestination {
  stage: JourneyStage;
  href: "/registro" | "/skills" | "/perfil";
  label: string;
  detail: string;
  isReturning: boolean;
}

export function isRequiredProfileComplete(profile: CandidateProfile): boolean {
  return isValidCandidateProfile(profile);
}

export function hasRegistrationStarted(profile: CandidateProfile): boolean {
  return Boolean(
    profile.fullName.trim() ||
      profile.email.trim() ||
      profile.program.trim() ||
      profile.semester.trim() ||
      profile.cumulativeAverage.trim() ||
      profile.studentCode.trim() ||
      profile.github.trim() ||
      profile.linkedin.trim() ||
      profile.portfolio.trim() ||
      profile.website.trim() ||
      profile.instagram.trim() ||
      profile.consentData ||
      profile.consentFiles
  );
}

export function canAccessSkillTree(state: AppState): boolean {
  return Boolean(
    isValidCandidateProfile(state.profile) &&
      (state.onboardingCompleted ||
        state.submitted ||
        Object.keys(state.progress).length > 0)
  );
}

export function getRegistrationStep(state: AppState): 1 | 2 {
  if (!isRequiredProfileComplete(state.profile)) return 1;
  return state.registrationStep;
}

export function getJourneyDestination(state: AppState): JourneyDestination {
  const hasLegacyJourney = Boolean(
    state.onboardingCompleted ||
      state.submitted ||
      Object.keys(state.progress).length > 0
  );

  if (!isRequiredProfileComplete(state.profile) && hasLegacyJourney) {
    return {
      stage: "registration",
      href: "/registro",
      label: "Actualizar mis datos",
      detail:
        "Conservamos todo tu avance. Actualiza tus datos académicos para continuar tu recorrido.",
      isReturning: true,
    };
  }

  if (state.submitted) {
    return {
      stage: "submitted",
      href: "/perfil",
      label: "Ver mi recorrido",
      detail: "Tu prueba ya fue enviada. Puedes volver a consultar el mapa que construiste.",
      isReturning: true,
    };
  }

  if (canAccessSkillTree(state)) {
    return {
      stage: "skills",
      href: "/skills",
      label: "Continuar mi recorrido",
      detail: "Tu avance está guardado. Retoma el árbol desde el punto en que lo dejaste.",
      isReturning: true,
    };
  }

  if (isRequiredProfileComplete(state.profile) && state.registrationStep === 2) {
    return {
      stage: "introduction",
      href: "/registro",
      label: "Continuar presentación",
      detail: "Tus datos ya están listos. Falta que te presentes a tu manera.",
      isReturning: true,
    };
  }

  if (hasRegistrationStarted(state.profile)) {
    return {
      stage: "registration",
      href: "/registro",
      label: "Continuar registro",
      detail: "Encontramos un registro en progreso en este dispositivo.",
      isReturning: true,
    };
  }

  return {
    stage: "new",
    href: "/registro",
    label: "Registrarme",
    detail: "Crea tu perfil y comienza a construir tu recorrido.",
    isReturning: false,
  };
}
