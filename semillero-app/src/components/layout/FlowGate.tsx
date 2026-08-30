"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canAccessSkillTree } from "@/lib/journey";
import { useAppState } from "@/lib/state/AppStateContext";
import { canFinishJourney } from "@/lib/unlock";

export function FlowGate({
  children,
  requireReady = false,
}: {
  children: React.ReactNode;
  requireReady?: boolean;
}) {
  const { state, hydrated, sessionActive } = useAppState();
  const router = useRouter();
  const canAccess = canAccessSkillTree(state);
  const ready = state.submitted || !requireReady || canFinishJourney(state.progress);

  useEffect(() => {
    if (!hydrated) return;

    if (!sessionActive) {
      router.replace("/");
      return;
    }

    if (!canAccess) {
      router.replace("/registro");
      return;
    }

    if (!ready) {
      router.replace("/skills");
    }
  }, [canAccess, hydrated, ready, router, sessionActive]);

  if (!hydrated || !sessionActive || !canAccess || !ready) {
    return (
      <div
        className="flex min-h-[calc(100dvh-61px)] flex-col items-center justify-center gap-4 px-6 text-center"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-cyan"
          aria-hidden="true"
        />
        <p className="text-sm text-muted">Preparando tu recorrido…</p>
      </div>
    );
  }

  return children;
}
