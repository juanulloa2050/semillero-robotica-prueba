"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/lib/auth/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RunStatus = "draft" | "submitted" | "evaluated";

interface AccountRow {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  academic: { program: string; semester: string; studentCode: string } | null;
  run: { id: string; status: RunStatus; updatedAt: string; evaluationCount: number } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || auth.role !== "admin") return;
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id,full_name,email,role,created_at,candidate_profiles(program,semester,student_code),candidate_run:assessment_runs!assessment_runs_candidate_id_fkey(id,status,updated_at,evaluations(id))")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setAccounts((data ?? []).map((value) => normalizeAccount(value as unknown as Record<string, unknown>)));
    setLoading(false);
  }, [auth.role]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) router.replace("/login");
    else if (auth.role === "candidate") router.replace("/skills");
    else if (auth.role === "evaluator") router.replace("/evaluador");
    else if (auth.role === "admin") void Promise.resolve().then(loadAccounts);
  }, [auth.loading, auth.role, auth.user, loadAccounts, router]);

  const summary = useMemo(() => ({
    users: accounts.length,
    candidates: accounts.filter((account) => account.role === "candidate").length,
    evaluators: accounts.filter((account) => account.role === "evaluator").length,
    pending: accounts.filter((account) => account.run?.status === "submitted").length,
  }), [accounts]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return accounts;
    return accounts.filter((account) => `${account.fullName} ${account.email} ${account.academic?.studentCode ?? ""}`.toLocaleLowerCase("es").includes(term));
  }, [accounts, search]);

  if (auth.loading || (loading && accounts.length === 0)) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">Cargando administración…</div>;

  return (
    <div className="mx-auto min-h-[calc(100svh-4rem)] max-w-[90rem] px-4 py-7 sm:px-7 lg:px-9">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
        <div className="max-w-2xl"><h1 className="text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Administración del proceso</h1><p className="mt-2 text-sm leading-6 text-muted">Supervisa cuentas, estados de entrega y permisos. Los cambios de rol quedan registrados en auditoría.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => void loadAccounts()} className="min-h-10 rounded-lg border border-line px-4 text-xs font-semibold text-ice transition-colors hover:border-cyan/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Actualizar</button><button type="button" onClick={() => void auth.signOut()} className="min-h-10 rounded-lg bg-surface-raised px-4 text-xs font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">Cerrar sesión</button></div>
      </header>

      {error && <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">No pudimos cargar la administración. {error}</p>}

      <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-xl border border-line sm:grid-cols-4 sm:divide-y-0">
        <SummaryItem label="Cuentas" value={summary.users} />
        <SummaryItem label="Aspirantes" value={summary.candidates} />
        <SummaryItem label="Evaluadores" value={summary.evaluators} />
        <SummaryItem label="Por evaluar" value={summary.pending} />
      </dl>

      <section className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-heading text-xl font-semibold text-ink">Cuentas y permisos</h2><p className="mt-1 text-xs leading-5 text-muted">Los aspirantes se registran desde la aplicación; los roles elevados sólo se conceden aquí o desde SQL.</p></div><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Buscar cuenta</span><SearchIcon /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o código" className="min-h-11 w-full rounded-xl border border-line bg-night/45 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-cyan" /></label></div>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,1fr)_9rem_10rem_11rem] gap-4 border-b border-line bg-night/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted lg:grid"><span>Cuenta</span><span>Perfil</span><span>Recorrido</span><span>Actividad</span><span>Permiso</span></div>
          <div className="divide-y divide-line bg-surface/30">
            {visible.length === 0 && <div className="p-8 text-center"><p className="text-sm font-semibold text-ice">No hay coincidencias</p><p className="mt-1 text-xs text-muted">Prueba con otro correo, nombre o código.</p></div>}
            {visible.map((account) => <AccountItem key={`${account.id}-${account.role}`} account={account} currentUserId={auth.user?.id ?? ""} onChanged={loadAccounts} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function AccountItem({ account, currentUserId, onChanged }: { account: AccountRow; currentUserId: string; onChanged: () => Promise<void> }) {
  const [nextRole, setNextRole] = useState<UserRole>(account.role);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const changed = nextRole !== account.role;

  async function saveRole() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !changed) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("admin_set_user_role", { target_user: account.id, next_role: nextRole });
    if (error) setMessage(error.message);
    else { setMessage("Rol actualizado."); await onChanged(); }
    setSaving(false);
  }

  return (
    <article className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(15rem,1.4fr)_minmax(10rem,1fr)_9rem_10rem_11rem] lg:items-center lg:gap-4">
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-ink">{account.fullName || "Sin nombre"}</p>{account.id === currentUserId && <span className="rounded-full border border-cyan/25 bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan">Tú</span>}</div><p className="mt-1 truncate text-xs text-muted">{account.email}</p></div>
      <div className="text-xs text-muted"><p className="text-ice">{account.academic?.program || roleLabel(account.role)}</p><p className="mt-1">{[account.academic?.semester && `Sem. ${account.academic.semester}`, account.academic?.studentCode].filter(Boolean).join(" · ") || "Sin datos académicos"}</p></div>
      <div><RunBadge status={account.run?.status ?? null} /></div>
      <div className="text-xs text-muted"><p>{formatDate(account.run?.updatedAt ?? account.createdAt)}</p><p className="mt-1">{account.run?.evaluationCount ?? 0} evaluaciones</p></div>
      <div>
        <div className="flex gap-2"><select aria-label={`Rol de ${account.fullName || account.email}`} value={nextRole} onChange={(event) => setNextRole(event.target.value as UserRole)} disabled={account.id === currentUserId || saving} className="min-h-10 min-w-0 flex-1 rounded-lg border border-line bg-night px-2 text-xs text-ink outline-none focus:border-cyan disabled:opacity-55"><option value="candidate">Aspirante</option><option value="evaluator">Evaluador</option><option value="admin">Administrador</option></select><button type="button" onClick={() => void saveRole()} disabled={!changed || saving} className="min-h-10 rounded-lg bg-action px-3 text-xs font-semibold text-white transition-colors hover:bg-tech disabled:cursor-not-allowed disabled:opacity-35">{saving ? "…" : "Guardar"}</button></div>
        <p role="status" className={`mt-1 min-h-4 text-[10px] ${message && message !== "Rol actualizado." ? "text-danger" : "text-muted"}`}>{message || (account.id === currentUserId ? "Tu rol está protegido" : "")}</p>
      </div>
    </article>
  );
}

function normalizeAccount(value: Record<string, unknown>): AccountRow {
  const academic = firstRelation(value.candidate_profiles);
  const run = firstRelation(value.candidate_run);
  return {
    id: String(value.id), fullName: String(value.full_name ?? ""), email: String(value.email ?? ""), role: value.role as UserRole, createdAt: String(value.created_at),
    academic: academic ? { program: String(academic.program ?? ""), semester: String(academic.semester ?? ""), studentCode: String(academic.student_code ?? "") } : null,
    run: run ? { id: String(run.id), status: run.status as RunStatus, updatedAt: String(run.updated_at), evaluationCount: Array.isArray(run.evaluations) ? run.evaluations.length : 0 } : null,
  };
}

function firstRelation(value: unknown): Record<string, unknown> | null { const item = Array.isArray(value) ? value[0] : value; return item && typeof item === "object" ? item as Record<string, unknown> : null; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function roleLabel(role: UserRole) { return role === "candidate" ? "Aspirante" : role === "evaluator" ? "Evaluador" : "Administrador"; }
function SummaryItem({ label, value }: { label: string; value: number }) { return <div className="bg-night/30 p-4 sm:p-5"><dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums text-ink">{value}</dd></div>; }
function RunBadge({ status }: { status: RunStatus | null }) { const copy = status ? { draft: "En curso", submitted: "Por evaluar", evaluated: "Evaluado" }[status] : "No aplica"; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${status === "evaluated" ? "border-ok/30 bg-ok/10 text-ok" : status === "submitted" ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-line bg-night/35 text-muted"}`}>{copy}</span>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>; }
