"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Button, EmptyState, Select, Skeleton, TextInput, useToasts, ToastStack } from "@/components/ui";
import { loadStore, mutate } from "@/lib/data";
import type { MergeCampo, MergeRule } from "@/lib/types";

const CAMPO_LABEL: Record<MergeCampo, string> = {
  empresa: "Empresa",
  area: "Área",
  cargo: "Cargo",
};

export default function ConfiguracionPage() {
  const [ready, setReady] = useState(false);
  const [rules, setRules] = useState<MergeRule[]>([]);
  const [campo, setCampo] = useState<MergeCampo>("area");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [nota, setNota] = useState("");
  const { toasts, push, dismiss } = useToasts();

  function reload() {
    setRules(loadStore().rules.map((r) => ({ ...r })));
  }

  useEffect(() => {
    loadStore();
    setReady(true);
    reload();
  }, []);

  if (!ready) return <Skeleton className="h-[360px] w-full" />;

  function add(event: FormEvent) {
    event.preventDefault();
    if (!origen.trim() || !destino.trim()) return;
    mutate((s) => {
      s.rules.push({
        id: `r${Date.now()}`,
        campo,
        origen: origen.trim(),
        destino: destino.trim(),
        activo: true,
        nota: nota.trim(),
      });
    });
    setOrigen("");
    setDestino("");
    setNota("");
    reload();
    push("ok", "Regla de homologación creada.");
  }

  function toggle(id: string) {
    mutate((s) => {
      const r = s.rules.find((x) => x.id === id);
      if (r) r.activo = !r.activo;
    });
    reload();
  }

  function remove(id: string) {
    mutate((s) => {
      s.rules = s.rules.filter((x) => x.id !== id);
    });
    reload();
    push("ok", "Regla eliminada.");
  }

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-ink-900">Homologación de nombres</h1>
        <p className="mt-0.5 text-sm text-ink-500 max-w-2xl">
          Cuando cambia el nombre de un área, empresa o cargo, una regla agrupa el valor histórico
          bajo el nombre nuevo en todo el dashboard, sin modificar los registros guardados. La
          coincidencia ignora tildes, mayúsculas y espacios.
        </p>
      </div>

      <form
        onSubmit={add}
        className="grid gap-2 rounded-[12px] border border-line bg-surface p-5 sm:grid-cols-[120px_1fr_1fr_auto]"
      >
        <Select value={campo} onChange={(e) => setCampo(e.target.value as MergeCampo)}>
          <option value="empresa">Empresa</option>
          <option value="area">Área</option>
          <option value="cargo">Cargo</option>
        </Select>
        <TextInput value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Nombre histórico (origen)" required />
        <TextInput value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Nombre nuevo (destino)" required />
        <Button variant="primary" type="submit">
          Agregar
        </Button>
        <TextInput
          className="sm:col-span-4"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota (opcional)"
        />
      </form>

      <ToastStack toasts={toasts} dismiss={dismiss} />

      {rules.length === 0 ? (
        <EmptyState
          title="Sin reglas de homologación"
          body="Agregue una regla cuando un área, empresa o cargo cambie de nombre y quiera unificar su historial."
        />
      ) : (
        <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-line-soft px-5 py-3 last:border-0">
              <span className="w-16 shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-center text-[11px] font-medium text-brand-700">
                {CAMPO_LABEL[r.campo]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink-700">
                  <span className="text-ink-500">{r.origen}</span>
                  <span className="mx-1.5 text-ink-300">→</span>
                  <span className="font-medium text-ink-900">{r.destino}</span>
                </p>
                {r.nota && <p className="truncate text-[11px] text-ink-400">{r.nota}</p>}
              </div>
              <button
                onClick={() => toggle(r.id)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  r.activo ? "bg-ok-50 text-ok-600" : "bg-line-soft text-ink-500"
                }`}
              >
                {r.activo ? "Activa" : "Inactiva"}
              </button>
              <button
                onClick={() => remove(r.id)}
                className="shrink-0 text-ink-400 hover:text-danger-600"
                aria-label="Eliminar"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
