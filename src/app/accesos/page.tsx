"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, EmptyState, Skeleton, TextInput } from "@/components/ui";

type AdminRow = { email: string; role: "owner" | "editor"; active: boolean; created_at: string };

export default function AccesosPage() {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    const current = user.user?.email?.toLowerCase();
    const { data, error: loadError } = await supabase.from("hc_admins").select("email,role,active,created_at").order("created_at");
    if (loadError) setError(loadError.message);
    else {
      const list = (data ?? []) as AdminRow[];
      setRows(list);
      setIsOwner(list.some((r) => r.email === current && r.role === "owner" && r.active));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const normalized = email.trim().toLowerCase();
    const { error: addError } = await supabase.from("hc_admins").upsert({ email: normalized, role: "editor", active: true }, { onConflict: "email" });
    if (addError) { setError(addError.message); return; }
    await supabase.from("hc_activity_logs").insert({ action: "manage_access", detail: { operation: "authorize", email: normalized } });
    setEmail(""); setMessage("Correo autorizado. La persona ya puede crear su contraseña."); load();
  }

  async function remove(target: string) {
    setError(""); setMessage("");
    const { error: removeError } = await supabase.from("hc_admins").delete().eq("email", target).eq("role", "editor");
    if (removeError) { setError(removeError.message); return; }
    await supabase.from("hc_activity_logs").insert({ action: "manage_access", detail: { operation: "revoke", email: target } });
    setMessage("Acceso retirado."); load();
  }

  if (rows === null && !error) return <Skeleton className="h-[320px] w-full" />;
  if (error && rows === null) return <EmptyState title="No se pudieron cargar los accesos" body={error} />;

  return <div className="fade-rise flex flex-col gap-4">
    <div><h1 className="text-[22px] font-semibold text-ink-900">Usuarios autorizados</h1><p className="mt-0.5 text-sm text-ink-500">Cada responsable utiliza su propio correo y contraseña.</p></div>
    {isOwner && <form onSubmit={add} className="flex gap-2 rounded-[12px] border border-line bg-surface p-5">
      <TextInput className="flex-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" required />
      <Button variant="primary" type="submit">Autorizar correo</Button>
    </form>}
    {message && <p className="text-sm text-brand-700">{message}</p>}
    {error && <p className="text-sm text-danger-600">{error}</p>}
    <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
      {(rows ?? []).map((row) => <div key={row.email} className="flex items-center gap-3 border-b border-line-soft px-5 py-3 last:border-0">
        <div><p className="text-sm font-medium text-ink-900">{row.email}</p><p className="text-xs text-ink-500">{row.role === "owner" ? "Administradora principal" : "Responsable autorizado"}</p></div>
        <span className="ml-auto text-xs text-ink-500">{row.active ? "Activo" : "Inactivo"}</span>
        {isOwner && row.role !== "owner" && <Button variant="ghost" onClick={() => remove(row.email)}>Retirar</Button>}
      </div>)}
    </section>
  </div>;
}
