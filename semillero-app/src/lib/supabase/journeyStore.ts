import type { AppState, CandidateProfile } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface RunRow {
  id: string;
  snapshot: unknown;
  status: "draft" | "submitted" | "evaluated";
  submitted_at: string | null;
}

export async function loadRemoteJourney(
  userId: string
): Promise<AppState | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const [{ data: profile }, { data: candidate }, { data: run }] =
    await Promise.all([
      supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
      supabase.from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("assessment_runs")
        .select("id,snapshot,status,submitted_at")
        .eq("candidate_id", userId)
        .maybeSingle<RunRow>(),
    ]);

  const snapshot = run?.snapshot;
  if (isAppState(snapshot)) return snapshot;
  if (!profile) return null;

  return {
    schemaVersion: 3,
    profile: {
      fullName: profile.full_name ?? "",
      email: profile.email ?? "",
      program: candidate?.program ?? "",
      semester: candidate?.semester ?? "",
      cumulativeAverage: candidate?.cumulative_average ?? "",
      studentCode: candidate?.student_code ?? "",
      github: candidate?.github ?? "",
      linkedin: candidate?.linkedin ?? "",
      portfolio: candidate?.portfolio ?? "",
      website: candidate?.website ?? "",
      instagram: candidate?.instagram ?? "",
      consentData: candidate?.consent_data === true,
      consentFiles: candidate?.consent_files === true,
    },
    introduction: [],
    registrationStep: 1,
    onboardingCompleted: false,
    progress: {},
    completedAt: {},
    challengeProgress: {},
    submitted: run?.status === "submitted" || run?.status === "evaluated",
    submittedAt: run?.submitted_at ? new Date(run.submitted_at).getTime() : null,
  };
}

export async function saveRemoteJourney(
  userId: string,
  state: AppState
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const profile = state.profile;
  const submittedAt = state.submittedAt
    ? new Date(state.submittedAt).toISOString()
    : null;

  const { data: run, error: runError } = await supabase
    .from("assessment_runs")
    .select("id,status")
    .eq("candidate_id", userId)
    .single();
  if (runError) throw runError;
  if (run.status !== "draft") return;

  const profileResults = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: profile.fullName, updated_at: new Date().toISOString() })
      .eq("id", userId),
    supabase
      .from("candidate_profiles")
      .update(toCandidateRow(profile))
      .eq("user_id", userId),
  ]);
  const failure = profileResults.find((result) => result.error)?.error;
  if (failure) throw failure;

  const nodeRows = Object.entries(state.progress)
    .filter(([, status]) => status === "completed")
    .map(([nodeId]) => ({
      run_id: run.id,
      node_id: nodeId,
      status: "completed",
      completed_at: state.completedAt[nodeId]
        ? new Date(state.completedAt[nodeId]).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  if (nodeRows.length) {
    const { error } = await supabase
      .from("node_progress")
      .upsert(nodeRows, { onConflict: "run_id,node_id" });
    if (error) throw error;
  }

  const stepRows = Object.values(state.challengeProgress).flatMap((challenge) =>
    Object.entries(challenge.steps).map(([stepId, step]) => ({
      run_id: run.id,
      node_id: challenge.nodeId,
      step_id: stepId,
      draft: step.draft,
      hints_used: step.revealedHints,
      active_seconds: Math.round(step.totalActiveSeconds),
      solved_at: step.solvedAt ? new Date(step.solvedAt).toISOString() : null,
      updated_at: new Date(challenge.updatedAt).toISOString(),
    }))
  );
  if (stepRows.length) {
    const { error } = await supabase
      .from("step_progress")
      .upsert(stepRows, { onConflict: "run_id,node_id,step_id" });
    if (error) throw error;
  }

  const attemptRows = Object.values(state.challengeProgress).flatMap((challenge) =>
    Object.values(challenge.steps).flatMap((step) =>
      step.attempts.map((attempt) => ({
        id: attempt.id,
        run_id: run.id,
        node_id: attempt.nodeId,
        step_id: attempt.stepId,
        attempt_number: attempt.attemptNumber,
        answer: attempt.answer,
        is_correct: attempt.isCorrect,
        score: attempt.score ?? null,
        duration_seconds: Math.round(attempt.durationSeconds),
        hints_used: attempt.hintsUsed,
        metadata: attempt.metadata ?? {},
        submitted_at: new Date(attempt.submittedAt).toISOString(),
      }))
    )
  );
  if (attemptRows.length) {
    const { error } = await supabase
      .from("attempts")
      .upsert(attemptRows, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }

  const { error: snapshotError } = await supabase
    .from("assessment_runs")
    .update({
      snapshot: state,
      schema_version: state.schemaVersion,
      status: state.submitted ? "submitted" : "draft",
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (snapshotError) throw snapshotError;
}

function toCandidateRow(profile: CandidateProfile) {
  return {
    program: profile.program,
    semester: profile.semester,
    cumulative_average: profile.cumulativeAverage,
    student_code: profile.studentCode || null,
    github: profile.github,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
    website: profile.website,
    instagram: profile.instagram,
    consent_data: profile.consentData,
    consent_files: profile.consentFiles,
    updated_at: new Date().toISOString(),
  };
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<AppState>;
  return (
    candidate.schemaVersion === 3 &&
    Boolean(candidate.profile) &&
    Boolean(candidate.progress) &&
    Boolean(candidate.challengeProgress) &&
    Array.isArray(candidate.introduction)
  );
}
