"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Trash } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { fetchAggregate, fetchBudget, fetchRules, normKey } from "@/lib/data";
import type { AggRow, BudgetRow, MergeCampo, MergeRule } from "@/lib/types";
import {
  Button,
  EmptyState,
  Skeleton,
  TextInput,
  ToastStack,
  useToasts,
} from "@/components/ui";
import { useAdmin } from "@/lib/use-admin";

const CAMPOS: MergeCampo[] = ["dotacion", "categoria", "area", "cargo"];

export default function ConfiguracionPage() {
  const isAdmin = useAdmin();
  const [rules, setRules] = useState<MergeRule[] | null>(null);
  const [agg, setAgg] = useState<AggRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchRules(), fetchAggregate(), fetchBudget()])
      .then(([r, a, b]) => {
        setRules(r);
        setAgg(a);
        setBudget(b);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  // todos los valores existentes (data + presupuesto), para sugerencias
  const valores = useMemo(() => {
    const set = new Set<string>();
    for (const c of CAMPOS) {
      for (const r of agg) if (r[c]) set.add(r[c]);
      for (const b of budget) if (b[c]) set.add(b[c]);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [agg, budget]);

  const addRule = useCallback(async () => {
    const o = origen.trim();
    const d = destino.trim();
    if (!o || !d) {
      push("error", "Completa el valor antiguo y el valor nuevo.");
      return;
    }
    if (normKey(o) === normKey(d)) {
      push("error", "El valor antiguo y el nuevo no pueden ser iguales.");
      return;
    }
    if (rules?.some((r) => normKey(r.origen) === normKey(o))) {
      push("error", `Ya existe una regla para "${o}".`);
      return;
    }
    setSaving(true);
    // 'todos' requiere la migración; si la BD aún no la tiene, cae a 'area'
    let res = await supabase
      .from("merge_rules")
      .insert({ campo: "todos", origen: o, destino: d })
      .select()
      .single();
    if (res.error && res.error.message.includes("check")) {
      res = await supabase
        .from("merge_rules")
        .insert({ campo: "area", origen: o, destino: d })
        .select()
        .single();
    }
    setSaving(false);
    if (res.error) {
      push("error", `No se pudo crear la regla: ${res.error.message}`);
      return;
    }
    setRules((prev) =>
      prev ? [...prev, res.data as MergeRule] : [res.data as MergeRule]
    );
    setOrigen("");
    setDestino("");
    push("ok", `Regla creada: "${o}" se agrupa bajo "${d}".`);
  }, [origen, destino, rules, push]);

  const toggleRule = useCallback(
    async (r: MergeRule) => {
      const { error: err } = await supabase
        .from("merge_rules")
        .update({ activo: !r.activo })
        .eq("id", r.id);
      if (err) {
        push("error", `No se pudo actualizar: ${err.message}`);
        return;
      }
      setRules((prev) =>
        prev ? prev.map((x) => (x.id === r.id ? { ...x, activo: !r.activo } : x)) : prev
      );
    },
    [push]
  );

  const deleteRule = useCallback(
    async (id: number) => {
      setConfirmDelete(null);
      const { error: err } = await supabase.from("merge_rules").delete().eq("id", id);
      if (err) push("error", `No se pudo eliminar: ${err.message}`);
      else {
        setRules((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
        push("ok", "Regla eliminada.");
      }
    },
    [push]
  );

  if (error) {
    return (
      <EmptyState
        title="No se pudo cargar la configuración"
        body={error}
        action={<Button variant="primary" onClick={load}>Reintentar</Button>}
      />
    );
  }

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
          Configuración
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Reglas de homologación para nombres que cambian con el tiempo.
        </p>
      </div>

      <section className="rounded-[12px] border border-line bg-surface px-5 py-4">
        <h2 className="text-[14px] font-semibold text-ink-900">Cómo funciona</h2>
        <div className="mt-1.5 max-w-[75ch] text-[13px] leading-relaxed text-ink-500">
          <p>
            Cuando un nombre cambia, los meses anteriores conservan el valor original
            por integridad. Una regla agrupa el valor antiguo bajo el nombre nuevo en
            todo el dashboard, sin modificar los registros guardados. La regla aplica
            en dotación, categoría, área y cargo a la vez, y es flexible:
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>
              No distingue mayúsculas, tildes ni espacios de más:{" "}
              <span className="font-medium text-ink-700">Gestión = GESTION</span>.
            </li>
            <li>
              También reemplaza dentro de nombres compuestos:{" "}
              <span className="font-medium text-ink-700">JEFE DE CAPITAL HUMANO</span>{" "}
              pasa a{" "}
              <span className="font-medium text-ink-700">JEFE DE GESTIÓN DE PERSONAS</span>.
            </li>
            <li>
              Las descargas de data cruda y la pestaña Presupuesto mantienen los
              valores originales.
            </li>
          </ul>
        </div>
      </section>

      {/* nueva regla */}
      {isAdmin && <section className="rounded-[12px] border border-line bg-surface">
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-ink-900">Nueva regla</h2>
          <p className="text-[12px] text-ink-500">
            Los registros con el valor antiguo se mostrarán dentro del valor nuevo.
          </p>
        </header>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-500">
            Valor antiguo (como está en la data)
            <TextInput
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              placeholder="CAPITAL HUMANO"
              list="valores-existentes"
            />
          </label>
          <span className="pb-2.5 text-ink-400">
            <ArrowRight size={16} />
          </span>
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12px] font-medium text-ink-500">
            Se agrupa dentro de
            <TextInput
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="GESTIÓN DE PERSONAS"
              list="valores-existentes"
            />
          </label>
          <Button variant="primary" onClick={addRule} disabled={saving}>
            <Plus size={15} /> {saving ? "Guardando…" : "Agregar regla"}
          </Button>
        </div>
        <datalist id="valores-existentes">
          {valores.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </section>}

      {/* reglas existentes */}
      <section className="rounded-[12px] border border-line bg-surface">
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-ink-900">Reglas</h2>
          <p className="text-[12px] text-ink-500">
            Puedes desactivar una regla para volver a ver los valores por separado.
          </p>
        </header>

        {!rules && (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        )}

        {rules && rules.length === 0 && (
          <div className="p-5">
            <EmptyState
              title="Sin reglas de homologación"
              body="Cuando un nombre cambie, crea una regla aquí arriba para que el dashboard agrupe el histórico bajo el nombre nuevo."
            />
          </div>
        )}

        {rules && rules.length > 0 && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 pl-5 pr-3">Regla</th>
                <th className="w-[120px] px-3 py-2.5">Estado</th>
                <th className="w-[140px] py-2.5 pl-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-line-soft">
                  <td className="py-2.5 pl-5 pr-3">
                    <span
                      className={`inline-flex flex-wrap items-center gap-2 ${
                        r.activo ? "" : "opacity-45"
                      }`}
                    >
                      <span className="rounded-[6px] bg-line-soft px-2 py-0.5 font-medium text-ink-700">
                        {r.origen}
                      </span>
                      <ArrowRight size={13} className="text-ink-400" />
                      <span className="rounded-[6px] bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                        {r.destino}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button disabled={!isAdmin}
                      onClick={() => toggleRule(r)}
                      className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
                        r.activo
                          ? "bg-ok-50 text-ok-600 hover:bg-ok-100"
                          : "bg-line-soft text-ink-500 hover:bg-line"
                      }`}
                      title={isAdmin ? (r.activo ? "Clic para desactivar" : "Clic para activar") : "Solo lectura"}
                    >
                      {r.activo ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right">
                    {!isAdmin ? <span className="text-xs text-ink-400">Solo lectura</span> :
                    confirmDelete === r.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Button size="sm" variant="danger" onClick={() => deleteRule(r.id)}>
                          Sí, eliminar
                        </Button>
                        <Button size="sm" onClick={() => setConfirmDelete(null)}>
                          No
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(r.id)}
                        aria-label="Eliminar regla"
                      >
                        <Trash size={14} /> Eliminar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
