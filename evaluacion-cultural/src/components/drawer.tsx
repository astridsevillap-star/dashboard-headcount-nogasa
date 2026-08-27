"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { score, signedScore, periodLabel } from "@/lib/format";
import { DIMENSIONES } from "@/lib/seed";
import { indiceEvaluado, metaGeneral, type Store } from "@/lib/data";
import { parsePeriod } from "@/lib/format";
import type { Evaluado } from "@/lib/types";

export function EvaluadoDrawer({
  store,
  evaluado,
  period,
  onClose,
}: {
  store: Store;
  evaluado: Evaluado | null;
  period: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!evaluado || typeof document === "undefined") return null;

  const anio = parsePeriod(period).y;
  const meta = metaGeneral(store, anio);
  const indice = indiceEvaluado(store, evaluado.id, period);

  const rows = DIMENSIONES.map((d) => {
    const row = store.evaluaciones.find(
      (e) => e.evaluadoId === evaluado.id && e.period === period && e.dimensionId === d.id
    );
    const objetivo =
      store.metas.find((m) => m.anio === anio && m.dimensionId === d.id)?.objetivo ?? 4;
    return { dim: d, valor: row?.score ?? null, objetivo };
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink-900/25 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="fade-rise relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-[-8px_0_32px_rgba(23,23,26,0.10)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{evaluado.nombre}</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {evaluado.cargo} · {evaluado.area} · {evaluado.empresa}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-[8px] p-1 text-ink-400 hover:bg-line-soft hover:text-ink-900"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-ink-500">Índice cultural</p>
            <p className="tnum font-mono text-[30px] font-semibold leading-none text-ink-900">
              {score(indice)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[12px] uppercase tracking-wide text-ink-500">
              Brecha vs meta {score(meta)}
            </p>
            <p
              className={`tnum font-mono text-[18px] font-semibold ${
                indice === null
                  ? "text-ink-400"
                  : indice - meta >= 0
                    ? "text-ok-600"
                    : indice - meta >= -0.5
                      ? "text-warn-600"
                      : "text-danger-600"
              }`}
            >
              {indice === null ? "–" : signedScore(indice - meta)}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-ink-500">
            Detalle por dimensión · {periodLabel(period)}
          </p>
          <div className="flex flex-col">
            {rows.map(({ dim, valor, objetivo }) => {
              const gap = valor === null ? null : valor - objetivo;
              const barPct = valor === null ? 0 : (valor / 5) * 100;
              const color =
                gap === null
                  ? "#c9c9cf"
                  : gap >= 0
                    ? "#0957c3"
                    : gap >= -0.5
                      ? "#b45309"
                      : "#e31013";
              return (
                <div key={dim.id} className="border-b border-line-soft py-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-ink-700">{dim.nombre}</span>
                    <span className="tnum font-mono text-[13px] font-medium text-ink-900">
                      {score(valor)}
                      <span className="ml-1 text-[11px] font-normal text-ink-400">
                        / {score(objetivo)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
