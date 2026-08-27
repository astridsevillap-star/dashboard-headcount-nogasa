"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { Skeleton, useToasts, ToastStack } from "@/components/ui";
import { anios, dimensiones, loadStore, mutate } from "@/lib/data";
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
  const years = anios();

  function setMeta(anio: number, dimensionId: string, value: number) {
    const v = Math.max(1, Math.min(5, Math.round(value * 2) / 2));
    mutate((s) => {
      const row = s.metas.find((m) => m.anio === anio && m.dimensionId === dimensionId);
      if (row) row.objetivo = v;
      else s.metas.push({ anio, dimensionId, objetivo: v });
    });
    setVersion((n) => n + 1);
  }

  function metaOf(anio: number, dimensionId: string): number {
    return store.metas.find((m) => m.anio === anio && m.dimensionId === dimensionId)?.objetivo ?? 4;
  }

  return (
    <div className="fade-rise flex flex-col gap-4" key={version}>
      <div>
        <h1 className="text-[22px] font-semibold text-ink-900">Metas por dimensión</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Objetivo de puntaje (1–5) por dimensión y año. Se usa como referencia en el dashboard
          y en el cálculo de brechas.
        </p>
      </div>

      <section className="overflow-x-auto rounded-[12px] border border-line bg-surface">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface px-5 py-3 text-left text-[12px] font-medium text-ink-500">
                Dimensión
              </th>
              {years.map((y) => (
                <th key={y} className="px-5 py-3 text-center text-[12px] font-medium text-ink-500">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dimensiones.map((d) => (
              <tr key={d.id}>
                <td className="sticky left-0 border-t border-line-soft bg-surface px-5 py-3">
                  <p className="text-[13px] font-medium text-ink-900">{d.nombre}</p>
                  <p className="max-w-xs text-[11px] leading-snug text-ink-400">{d.descripcion}</p>
                </td>
                {years.map((y) => {
                  const v = metaOf(y, d.id);
                  return (
                    <td key={y} className="border-t border-line-soft px-5 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setMeta(y, d.id, v - 0.5)}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
                          aria-label="Reducir"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <span className="w-9 tnum font-mono text-[14px] font-semibold text-ink-900">
                          {score(v)}
                        </span>
                        <button
                          onClick={() => setMeta(y, d.id, v + 0.5)}
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
                          aria-label="Aumentar"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-[12px] text-ink-500">
        Los cambios se guardan automáticamente en este navegador.
      </p>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
