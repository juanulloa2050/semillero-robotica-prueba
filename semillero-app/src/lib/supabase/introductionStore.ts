import type { IntroItemType } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function uploadIntroductionFile(
  file: File,
  kind: IntroItemType
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: run, error: runError } = await supabase
    .from("assessment_runs")
    .select("id")
    .eq("candidate_id", user.id)
    .single();
  if (runError) throw runError;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${run.id}/introduction/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) throw uploadError;
  const { error: rowError } = await supabase.from("introductions").insert({
    run_id: run.id,
    kind,
    title: file.name,
    storage_path: path,
  });
  if (rowError) {
    await supabase.storage.from("evidence").remove([path]);
    throw rowError;
  }
  return `storage:${path}`;
}
