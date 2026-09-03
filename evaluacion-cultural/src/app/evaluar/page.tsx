"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Skeleton, useToasts, ToastStack } from "@/components/ui";
import {
  evaluados,
  loadStore,
  participacionDe,
  preguntasDe,
  registrarEvaluacion,
  NIVEL_LABEL,
  type Store,
} from "@/lib/data";
import { competencias } from "@/lib/data";
import { ESCALA, EDICION } from "@/lib/seed";
import type { Persona } from "@/lib/types";

export default function EvaluarPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [evaluadoId, setEvaluadoId] = useState<string>("");
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [version, setVersion] = useState(0);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const lista = useMemo(() => (store ? evaluados(store) : []), [store, version]);
  const evaluado = lista.find((p) => p.id === evaluadoId) ?? null;
  const preguntas = store && evaluado ? preguntasDe(store, evaluado) : [];

  if (!store) return <Skeleton className="h-[420px] w-full" />;

  function pick(id: string) {
    setEvaluadoId(id);
    setRespuestas({});
  }

  const total = preguntas.length;
  const contestadas = Object.keys(respuestas).length;
  const completo = total > 0 && contestadas === total;

  function enviar() {
    if (!evaluado || !completo) return;
    registrarEvaluacion(evaluado.id, respuestas);
    push("ok", `Evaluación de ${evaluado.nombre} registrada.`);
    setRespuestas({});
    setVersion((n) => n + 1);
    setStore(loadStore());
  }

  const part = evaluado ? participacionDe(store, evaluado) : null;

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-ink-900">Registrar evaluación</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Evaluación cultural {EDICION} · elige a la persona evaluada y responde cada conducta observable.
          Las respuestas se guardan de forma anónima y agregada.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-surface p-4">
        <label className="text-sm text-ink-500">Persona evaluada</label>
        <Select value={evaluadoId} onChange={(e) => pick(e.target.value)} className="min-w-[280px] flex-1">
          <option value="">Selecciona…</option>
          {[1, 2, 3].map((n) => {
            const grupo = lista.filter((p) => p.nivel === n);
            if (grupo.length === 0) return null;
            return (
              <optgroup key={n} label={NIVEL_LABEL[n as 1 | 2 | 3]}>
                {grupo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {p.area}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
        {part && (
          <span className="text-[12px] text-ink-500">
            {part.respondientes}/{part.esperados} evaluadores han respondido
          </span>
        )}
      </div>

      {!evaluado ? (
        <p className="rounded-[12px] border border-dashed border-ink-300 bg-surface px-6 py-16 text-center text-sm text-ink-500">
          Selecciona a la persona evaluada para ver el cuestionario.
        </p>
      ) : (
        <>
          {competencias.map((c) => {
            const qs = preguntas.filter((q) => q.competenciaId === c.id);
            if (qs.length === 0) return null;
            return (
              <section key={c.id} className="rounded-[12px] border border-line bg-surface p-5">
                <h2 className="mb-3 text-[15px] font-semibold text-ink-900">{c.nombre}</h2>
                <div className="flex flex-col gap-3">
                  {qs.map((q) => (
                    <div key={q.id} className="border-b border-line-soft pb-3 last:border-0 last:pb-0">
                      <p className="text-[13px] text-ink-700">{q.texto}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ESCALA.map((op) => {
                          const sel = respuestas[q.id] === op.value;
                          return (
                            <button
                              key={op.value}
                              onClick={() => setRespuestas((prev) => ({ ...prev, [q.id]: op.value }))}
                              className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] transition-colors ${
                                sel
                                  ? "border-brand-600 bg-brand-50 text-brand-700"
                                  : "border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
                              }`}
                            >
                              <span className="tnum font-mono font-semibold">{op.value}</span>
                              {op.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface/95 p-4 shadow-[0_8px_24px_rgba(23,23,26,0.08)] backdrop-blur">
            <span className="text-[13px] text-ink-500">
              {contestadas} de {total} conductas respondidas
            </span>
            <Button variant="primary" onClick={enviar} disabled={!completo}>
              {completo ? "Registrar evaluación" : `Faltan ${total - contestadas}`}
            </Button>
          </div>
        </>
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
