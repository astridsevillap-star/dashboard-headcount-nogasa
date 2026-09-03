"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { Skeleton, useToasts, ToastStack } from "@/components/ui";
import { competencias, loadStore, mutate } from "@/lib/data";
import { score } from "@/lib/format";

export default function MetasPage() {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const { toasts, dismiss } = useToasts();

  useEffect(() => {
    loadStore();
    setReady(true);
  }, []);

  if (!ready) return <Skeleton className="h-[360px] w-full" />;

  const store = loadStore();

  function metaOf(id: string): number {
    return store.metas.find((m) => m.competenciaId === id)?.objetivo ?? 4;
  }

  function setMeta(id: string, value: number) {
    const v = Math.max(1, Math.min(5, Math.round(value * 2) / 2));
    mutate((s) => {
      const row = s.metas.find((m) => m.competenciaId === id);
      if (row) row.objetivo = v;
      else s.metas.push({ competenciaId: id, objetivo: v });
    });
    setVersion((n) => n + 1);
  }

  return (
    <div className="fade-rise flex flex-col gap-4" key={version}>
      <div>
        <h1 className="text-[22px] font-semibold text-ink-900">Metas por competencia</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Objetivo de puntaje (1–5) por competencia. Se usa como referencia en el dashboard y en el
          cálculo de brechas.
        </p>
      </div>

      <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
        {competencias.map((c) => {
          const v = metaOf(c.id);
          return (
            <div key={c.id} className="flex items-center gap-4 border-b border-line-soft px-5 py-3.5 last:border-0">
              <span className="flex-1 text-[14px] font-medium text-ink-900">{c.nombre}</span>
              <div className="inline-flex items-center gap-1.5">
                <button
                  onClick={() => setMeta(c.id, v - 0.5)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
                  aria-label="Reducir"
                >
                  <Minus size={12} weight="bold" />
                </button>
                <span className="w-9 text-center tnum font-mono text-[15px] font-semibold text-ink-900">
                  {score(v)}
                </span>
                <button
                  onClick={() => setMeta(c.id, v + 0.5)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
                  aria-label="Aumentar"
                >
                  <Plus size={12} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-[12px] text-ink-500">Los cambios se guardan automáticamente en este navegador.</p>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
