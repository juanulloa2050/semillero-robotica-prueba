"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppState,
  CandidateProfile,
  IntroItem,
  NodeChallengeProgress,
  NodeStatus,
} from "@/lib/types";
import { canFinishJourney, computeStatus } from "@/lib/unlock";
import { isValidCandidateProfile } from "@/lib/admissions";
import {
  IMPLEMENTED_CHALLENGE_NODE_IDS,
  IMPLEMENTED_CHALLENGE_PROGRESS,
  getChallengeProgressDefinition,
  isImplementedChallengeNodeId,
} from "@/lib/challenges/registry";
import {
  hasCompletedChallenge,
  isPositiveTimestamp,
  mergeNodeChallengeProgress,
  normalizeNodeChallengeProgress,
} from "@/lib/challenges/progress";
import { clearAllEvidenceFiles } from "@/lib/challenges/evidenceStore";
import { nodeById } from "@/lib/data/nodes";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  loadRemoteJourney,
  saveRemoteJourney,
} from "@/lib/supabase/journeyStore";
import {
  candidateStorageKey,
  createJourneyWriter,
  reconcileJourneys,
  type CachedJourney,
} from "./journeySync";

const STORAGE_KEY = "semillero-app-state-v1";
const SESSION_KEY = "semillero-session-active";

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  program: "",
  semester: "",
  cumulativeAverage: "",
  studentCode: "",
  github: "",
  linkedin: "",
  portfolio: "",
  website: "",
  instagram: "",
  consentData: false,
  consentFiles: false,
};

const defaultState: AppState = {
  schemaVersion: 3,
  profile: emptyProfile,
  introduction: [],
  registrationStep: 1,
  onboardingCompleted: false,
  progress: {},
  completedAt: {},
  challengeProgress: {},
  submitted: false,
  submittedAt: null,
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AppStateContextValue {
  state: AppState;
  hydrated: boolean;
  sessionActive: boolean;
  saveStatus: SaveStatus;
  startSession: () => void;
  endSession: () => void;
  flushNow: () => void;
  updateProfile: (patch: Partial<CandidateProfile>) => void;
  setRegistrationStep: (step: 1 | 2) => void;
  addIntroItem: (item: Omit<IntroItem, "id" | "createdAt">) => void;
  removeIntroItem: (id: string) => void;
  completeOnboarding: () => void;
  saveChallengeProgress: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  completeChallenge: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  completeNode: (nodeId: string) => void;
  submitJourney: () => void;
  resetAll: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const INTRO_TYPES = new Set<IntroItem["type"]>([
  "text",
  "image",
  "audio",
  "video",
  "file",
  "link",
]);
const NODE_STATUSES = new Set<NodeStatus>(["locked", "available", "completed"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProfile(value: unknown): CandidateProfile {
  const source = isRecord(value) ? value : {};
  const text = (key: keyof CandidateProfile) =>
    typeof source[key] === "string" ? source[key] : "";

  return {
    fullName: text("fullName"),
    email: text("email"),
    program: text("program"),
    semester: text("semester"),
    cumulativeAverage: text("cumulativeAverage"),
    studentCode: text("studentCode"),
    github: text("github"),
    linkedin: text("linkedin"),
    portfolio: text("portfolio"),
    website: text("website"),
    instagram: text("instagram"),
    consentData: source.consentData === true,
    consentFiles: source.consentFiles === true,
  };
}

function normalizeProgress(value: unknown): Record<string, NodeStatus> {
  if (!isRecord(value)) return {};
  const normalized: Record<string, NodeStatus> = {};
  for (const [nodeId, status] of Object.entries(value)) {
    if (typeof status === "string" && NODE_STATUSES.has(status as NodeStatus)) {
      normalized[nodeId] = status as NodeStatus;
    }
  }
  return normalized;
}

function normalizeCompletedAt(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const normalized: Record<string, number> = {};
  for (const [nodeId, timestamp] of Object.entries(value)) {
    if (isPositiveTimestamp(timestamp)) normalized[nodeId] = timestamp;
  }
  return normalized;
}

function normalizeIntroduction(value: unknown): IntroItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.type !== "string" ||
      !INTRO_TYPES.has(item.type as IntroItem["type"]) ||
      typeof item.title !== "string" ||
      typeof item.content !== "string" ||
      !isPositiveTimestamp(item.createdAt)
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        type: item.type as IntroItem["type"],
        title: item.title,
        content: item.content,
        createdAt: item.createdAt,
      },
    ];
  });
}

function loadState(key = STORAGE_KEY): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultState;
    const parsedValue: unknown = JSON.parse(raw);
    if (!isRecord(parsedValue)) return defaultState;
    const parsed = isRecord(parsedValue.state) ? parsedValue.state : parsedValue;
    const profile = normalizeProfile(parsed.profile);
    const profileLooksComplete = isValidCandidateProfile(profile);
    const challengeProgress: Record<string, NodeChallengeProgress> = {};
    const rawChallenges = isRecord(parsed.challengeProgress)
      ? parsed.challengeProgress
      : {};
    for (const nodeId of IMPLEMENTED_CHALLENGE_NODE_IDS) {
      const normalized = normalizeNodeChallengeProgress(
        rawChallenges[nodeId],
        IMPLEMENTED_CHALLENGE_PROGRESS[nodeId]
      );
      if (normalized) challengeProgress[nodeId] = normalized;
    }
    const progress = normalizeProgress(parsed.progress);
    const completedAt = normalizeCompletedAt(parsed.completedAt);
    const sourceVersion =
      typeof parsed.schemaVersion === "number" &&
      Number.isFinite(parsed.schemaVersion)
        ? parsed.schemaVersion
        : 1;
    const submitted = parsed.submitted === true;
    const introduction = normalizeIntroduction(parsed.introduction);

    // Before schema v3, E1A-E4 could be completed by a prototype button. For
    // editable journeys, detailed steps are now the source of truth. Reconcile
    // them in tree order so every level still requires all preceding siblings.
    if (!submitted && sourceVersion <= 3) {
      for (const nodeId of IMPLEMENTED_CHALLENGE_NODE_IDS) {
        const definition = IMPLEMENTED_CHALLENGE_PROGRESS[nodeId];
        const detailed = challengeProgress[nodeId];
        const requirements = nodeById(nodeId)?.requires ?? [];
        const requirementsComplete = requirements.every(
          (requirementId) => progress[requirementId] === "completed"
        );

        if (hasCompletedChallenge(detailed, definition) && requirementsComplete) {
          const completionTimestamp =
            detailed?.completedAt ??
            Math.max(
              ...definition.stepIds.map(
                (stepId) => detailed?.steps[stepId]?.solvedAt ?? 0
              )
            );
          challengeProgress[nodeId] = {
            ...detailed,
            completedAt: completionTimestamp,
          };
          progress[nodeId] = "completed";
          completedAt[nodeId] = completionTimestamp;
        } else {
          delete progress[nodeId];
          delete completedAt[nodeId];
        }
      }
    }

    return {
      schemaVersion: 3,
      profile,
      progress,
      completedAt,
      challengeProgress,
      introduction,
      registrationStep:
        parsed.registrationStep === 2
          ? 2
          : parsed.registrationStep === 1
            ? 1
            : profileLooksComplete
              ? 2
              : 1,
      onboardingCompleted:
        typeof parsed.onboardingCompleted === "boolean"
          ? parsed.onboardingCompleted
          : Boolean(
              submitted ||
                Object.keys(progress).length > 0 ||
                (profileLooksComplete && introduction.length > 0)
            ),
      submitted,
      submittedAt: isPositiveTimestamp(parsed.submittedAt)
        ? parsed.submittedAt
        : null,
    };
  } catch {
    return defaultState;
  }
}

function loadCandidateCache(userId: string, email: string): CachedJourney | null {
  try {
    const raw = window.localStorage.getItem(candidateStorageKey(userId));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && isRecord(parsed.state)) {
        return {
          state: loadState(candidateStorageKey(userId)),
          savedAt: isPositiveTimestamp(parsed.savedAt) ? parsed.savedAt : 0,
        };
      }
    }
    // Import only a matching legacy cache; the old key was shared by every
    // account on the same browser.
    const legacy = loadState();
    if (legacy.profile.email.toLowerCase() === email.toLowerCase() && email) {
      return { state: legacy, savedAt: 0 };
    }
  } catch { /* Storage may be unavailable. Remote loading still works. */ }
  return null;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AppState>(defaultState);
  const readyUserId = useRef<string | null>(null);
  const remoteLoadFailed = useRef<string | null>(null);
  const writers = useRef(new Map<string, ReturnType<typeof createJourneyWriter>>());
  const saveRevision = useRef(0);

  useEffect(() => {
    // One-time sync from localStorage after mount, so SSR/client hydration match.
    const restoredState = auth.configured ? defaultState : loadState();
    stateRef.current = restoredState;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(restoredState);
    if (!auth.configured) {
      try {
        setSessionActive(window.sessionStorage.getItem(SESSION_KEY) === "true");
      } catch {
        setSessionActive(false);
        setSaveStatus("error");
      }
      setHydrated(true);
    }
  }, [auth.configured]);

  useEffect(() => {
    if (!auth.configured || auth.loading) return;
    if (!auth.user) {
      readyUserId.current = null;
      remoteLoadFailed.current = null;
      void Promise.resolve().then(() => {
        setSessionActive(false);
        setHydrated(true);
      });
      return;
    }

    let active = true;
    const userId = auth.user.id;
    readyUserId.current = null;
    remoteLoadFailed.current = null;
    const cached = loadCandidateCache(userId, auth.user.email ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false);
    void loadRemoteJourney(auth.user.id)
      .then((remote) => {
        if (!active) return;
        const next = reconcileJourneys(remote?.state ?? null, remote?.updatedAt ?? 0, cached) ?? defaultState;
        stateRef.current = next;
        setState(next);
        remoteLoadFailed.current = null;
        readyUserId.current = userId;
        setSessionActive(true);
        setHydrated(true);
      })
      .catch(() => {
        if (!active) return;
        // Do not expose another account's state or overwrite the server after
        // a failed read. A matching local cache remains usable until retry.
        const next = cached?.state ?? defaultState;
        stateRef.current = next;
        setState(next);
        remoteLoadFailed.current = userId;
        readyUserId.current = userId;
        setSaveStatus("error");
        setSessionActive(true);
        setHydrated(true);
      });
    return () => {
      active = false;
      if (readyUserId.current === userId) readyUserId.current = null;
    };
  }, [auth.configured, auth.loading, auth.user]);

  const commitState = useCallback(
    (update: (previous: AppState) => AppState) => {
      const next = update(stateRef.current);
      if (Object.is(next, stateRef.current)) return;
      stateRef.current = next;
      setState(next);
    },
    []
  );

  const persistState = useCallback((snapshot: AppState) => {
    try {
      if (!auth.configured) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setSaveStatus("saved");
        return;
      }
      if (!auth.user || auth.role !== "candidate" || readyUserId.current !== auth.user.id) return;
      const userId = auth.user.id;
      window.localStorage.setItem(candidateStorageKey(userId), JSON.stringify({ state: snapshot, savedAt: Date.now() }));
      if (remoteLoadFailed.current === userId) {
        setSaveStatus("error");
        return;
      }
      let writer = writers.current.get(userId);
      if (!writer) {
        writer = createJourneyWriter((next) => saveRemoteJourney(userId, next));
        writers.current.set(userId, writer);
      }
      const revision = ++saveRevision.current;
      writer(snapshot, (error) => {
        if (readyUserId.current !== userId || revision !== saveRevision.current) return;
        setSaveStatus(error ? "error" : "saved");
      });
    } catch {
      setSaveStatus("error");
    }
  }, [auth.configured, auth.role, auth.user]);

  const flushNow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    persistState(stateRef.current);
  }, [persistState]);

  const startSession = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      setSaveStatus("error");
    }
    setSessionActive(true);
  }, []);

  const endSession = useCallback(() => {
    flushNow();
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      setSaveStatus("error");
    }
    setSessionActive(false);
    if (auth.configured) void auth.signOut();
  }, [auth, flushNow]);

  useEffect(() => {
    if (!hydrated || (auth.configured && (!auth.user || auth.role !== "candidate" || readyUserId.current !== auth.user.id))) return;
    // Debounced sync to localStorage whenever state changes (autosave).
    setSaveStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTimeout.current = null;
      persistState(state);
    }, 350);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state, hydrated, persistState, auth.configured, auth.user, auth.role]);

  useEffect(() => {
    if (
      !hydrated ||
      saveStatus !== "error" ||
      !auth.configured ||
      !auth.user ||
      auth.role !== "candidate"
    ) return;

    const retry = window.setTimeout(() => {
      setSaveStatus("saving");
      if (remoteLoadFailed.current === auth.user?.id) {
        const userId = auth.user.id;
        void loadRemoteJourney(userId)
          .then((remote) => {
            if (readyUserId.current !== userId) return;
            const cached = loadCandidateCache(userId, auth.user?.email ?? "");
            const next = reconcileJourneys(remote?.state ?? null, remote?.updatedAt ?? 0, cached) ?? stateRef.current;
            stateRef.current = next;
            setState(next);
            remoteLoadFailed.current = null;
            persistState(next);
          })
          .catch(() => {
            if (readyUserId.current === userId) setSaveStatus("error");
          });
      } else {
        persistState(stateRef.current);
      }
    }, 3000);

    return () => window.clearTimeout(retry);
  }, [auth.configured, auth.role, auth.user, hydrated, persistState, saveStatus]);

  useEffect(() => {
    if (!hydrated || (auth.configured && (!auth.user || auth.role !== "candidate" || readyUserId.current !== auth.user.id))) return;
    const persistBeforeLeaving = () => flushNow();
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", persistBeforeLeaving);
    document.addEventListener("visibilitychange", persistWhenHidden);
    return () => {
      window.removeEventListener("pagehide", persistBeforeLeaving);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, [flushNow, hydrated, auth.configured, auth.user, auth.role]);

  const updateProfile = useCallback((patch: Partial<CandidateProfile>) => {
    commitState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
    }));
  }, [commitState]);

  const setRegistrationStep = useCallback((registrationStep: 1 | 2) => {
    commitState((prev) => ({ ...prev, registrationStep }));
  }, [commitState]);

  const addIntroItem = useCallback((item: Omit<IntroItem, "id" | "createdAt">) => {
    commitState((prev) => ({
      ...prev,
      introduction: [
        ...prev.introduction,
        { ...item, id: crypto.randomUUID(), createdAt: Date.now() },
      ],
    }));
  }, [commitState]);

  const removeIntroItem = useCallback((id: string) => {
    commitState((prev) => ({
      ...prev,
      introduction: prev.introduction.filter((item) => item.id !== id),
    }));
  }, [commitState]);

  const completeOnboarding = useCallback(() => {
    commitState((prev) => ({ ...prev, onboardingCompleted: true }));
  }, [commitState]);

  const saveChallengeProgress = useCallback(
    (nodeId: string, challengeProgress: NodeChallengeProgress) => {
      commitState((prev) => {
        const definition = getChallengeProgressDefinition(nodeId);
        const normalized = definition
          ? normalizeNodeChallengeProgress(challengeProgress, definition)
          : null;
        if (!definition || !normalized || normalized.nodeId !== nodeId) return prev;
        const merged = mergeNodeChallengeProgress(
          prev.challengeProgress[nodeId],
          normalized,
          definition
        );
        if (!merged) return prev;
        if (Object.is(merged, prev.challengeProgress[nodeId])) return prev;
        return {
          ...prev,
          challengeProgress: {
            ...prev.challengeProgress,
            [nodeId]: merged,
          },
        };
      });
    },
    [commitState]
  );

  const completeChallenge = useCallback(
    (nodeId: string, challengeProgress: NodeChallengeProgress) => {
      commitState((prev) => {
        const definition = getChallengeProgressDefinition(nodeId);
        const normalized = definition
          ? normalizeNodeChallengeProgress(challengeProgress, definition)
          : null;
        if (
          !definition ||
          !normalized ||
          normalized.nodeId !== nodeId ||
          prev.submitted ||
          !isValidCandidateProfile(prev.profile) ||
          computeStatus(nodeId, prev.progress) !== "available"
        ) {
          return prev;
        }

        const completedChallenge = mergeNodeChallengeProgress(
          prev.challengeProgress[nodeId],
          {
            ...normalized,
            completedAt: normalized.completedAt ?? Date.now(),
            updatedAt: Date.now(),
          },
          definition
        );
        if (!completedChallenge || !hasCompletedChallenge(completedChallenge, definition)) {
          return prev;
        }

        const timestamp = completedChallenge.completedAt ?? Date.now();
        return {
          ...prev,
          challengeProgress: {
            ...prev.challengeProgress,
            [nodeId]: { ...completedChallenge, completedAt: timestamp },
          },
          progress: { ...prev.progress, [nodeId]: "completed" as NodeStatus },
          completedAt: { ...prev.completedAt, [nodeId]: timestamp },
        };
      });
    },
    [commitState]
  );

  const completeNode = useCallback((nodeId: string) => {
    commitState((prev) => {
      if (
        prev.submitted ||
        !isValidCandidateProfile(prev.profile) ||
        isImplementedChallengeNodeId(nodeId) ||
        computeStatus(nodeId, prev.progress) !== "available"
      ) {
        return prev;
      }
      return {
        ...prev,
        progress: { ...prev.progress, [nodeId]: "completed" as NodeStatus },
        completedAt: { ...prev.completedAt, [nodeId]: Date.now() },
      };
    });
  }, [commitState]);

  const submitJourney = useCallback(() => {
    commitState((prev) => {
      if (
        prev.submitted ||
        !isValidCandidateProfile(prev.profile) ||
        !canFinishJourney(prev.progress)
      ) {
        return prev;
      }
      return { ...prev, submitted: true, submittedAt: Date.now() };
    });
  }, [commitState]);

  const resetAll = useCallback(() => {
    let storageError = false;
    try {
      window.localStorage.removeItem(auth.configured && auth.user ? candidateStorageKey(auth.user.id) : STORAGE_KEY);
    } catch {
      storageError = true;
    }
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      storageError = true;
    }
    void clearAllEvidenceFiles().catch(() => setSaveStatus("error"));
    stateRef.current = defaultState;
    setState(defaultState);
    setSessionActive(false);
    if (auth.configured) void auth.signOut();
    setSaveStatus(storageError ? "error" : "idle");
  }, [auth]);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      sessionActive,
      saveStatus,
      startSession,
      endSession,
      flushNow,
      updateProfile,
      setRegistrationStep,
      addIntroItem,
      removeIntroItem,
      completeOnboarding,
      saveChallengeProgress,
      completeChallenge,
      completeNode,
      submitJourney,
      resetAll,
    }),
    [
      state,
      hydrated,
      sessionActive,
      saveStatus,
      startSession,
      endSession,
      flushNow,
      updateProfile,
      setRegistrationStep,
      addIntroItem,
      removeIntroItem,
      completeOnboarding,
      saveChallengeProgress,
      completeChallenge,
      completeNode,
      submitJourney,
      resetAll,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
