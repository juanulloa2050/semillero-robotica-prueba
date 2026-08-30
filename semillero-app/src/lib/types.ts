export type BranchId =
  | "design"
  | "mechanics"
  | "electronics"
  | "control"
  | "software"
  | "ai"
  | "systems";

export type NodeCategory =
  | "fundamentos"
  | "sub"
  | "aplicacion"
  | "profundizacion"
  | "critica"
  | "libre";

export interface Branch {
  id: BranchId;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
}

export interface SkillNodeDef {
  id: string;
  branchId: BranchId;
  depth: number;
  offset: number;
  title: string;
  category: NodeCategory;
  typeLabel: string;
  description: string;
  requires: string[];
}

export type NodeStatus = "locked" | "available" | "completed";

export interface CandidateProfile {
  fullName: string;
  email: string;
  program: string;
  semester: string;
  cumulativeAverage: string;
  studentCode: string;
  github: string;
  linkedin: string;
  portfolio: string;
  website: string;
  instagram: string;
  consentData: boolean;
  consentFiles: boolean;
}

export type IntroItemType = "text" | "image" | "audio" | "video" | "file" | "link";

export interface IntroItem {
  id: string;
  type: IntroItemType;
  title: string;
  content: string;
  createdAt: number;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ChallengeAttempt {
  id: string;
  nodeId: string;
  stepId: string;
  attemptNumber: number;
  startedAt: number;
  submittedAt: number;
  durationSeconds: number;
  answer: JsonValue;
  isCorrect: boolean | null;
  hintsUsed: number;
  score?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ChallengeStepProgress {
  draft: JsonValue;
  attempts: ChallengeAttempt[];
  revealedHints: number;
  totalActiveSeconds: number;
  solvedAt: number | null;
}

export interface NodeChallengeProgress {
  nodeId: string;
  currentStepId: string;
  shuffleSeed: number;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  steps: Record<string, ChallengeStepProgress>;
  analytics: Record<string, string | number | boolean>;
}

export interface AppState {
  schemaVersion: 3;
  profile: CandidateProfile;
  introduction: IntroItem[];
  registrationStep: 1 | 2;
  onboardingCompleted: boolean;
  progress: Record<string, NodeStatus>;
  completedAt: Record<string, number>;
  challengeProgress: Record<string, NodeChallengeProgress>;
  submitted: boolean;
  submittedAt: number | null;
}
