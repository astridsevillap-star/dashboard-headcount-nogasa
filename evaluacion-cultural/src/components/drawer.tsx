"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users } from "@phosphor-icons/react";
import { score, signedScore, pct } from "@/lib/format";
import {
  avgOf,
  competenciaScoresDe,
  distDe,
  indiceDe,
  metaGeneral,
  nOf,
  participacionDe,
  pctOf,
  preguntasDe,
} from "@/lib/data";
import type { Resultados } from "@/lib/backend";
import type { Persona } from "@/lib/types";

const toneText = (gap: number | null) =>
  gap === null ? "text-ink-400" : gap >= 0 ? "text-ok-600" : gap >= -0.5 ? "text-warn-600" : "text-danger-600";
const toneColor = (gap: number | null) =>
  gap === null ? "#c9c9cf" : gap >= 0 ? "#0957c3" : gap >= -0.5 ? "#b45309" : "#e31013";
const ESCALA_COLORS = ["#c0392b", "#d98a4e", "#9db4e6", "#5b7fd4", "#2f4fb0"];

export function EvaluadoDrawer({
  results,
  evaluado,
  onClose,
}: {
  results: Resultados;
  evaluado: Persona | null;
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

  const meta = metaGeneral();
  const indice = indiceDe(results, evaluado);
  const cs = competenciaScoresDe(results, evaluado);
  const part = participacionDe(results, evaluado);
  const qs = preguntasDe(evaluado);
  const cobertura = part.esperados ? (part.respondientes / part.esperados) * 100 : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-900/25 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className="fade-rise relative flex h-full w-full max-w-lg flex-col border-l border-line bg-surface shadow-[-8px_0_32px_rgba(23,23,26,0.10)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{evaluado.nombre}</p>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {evaluado.cargo} · {evaluado.area}{evaluado.region ? ` · ${evaluado.region}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-[8px] p-1 text-ink-400 hover:bg-line-soft hover:text-ink-900" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-px border-b border-line bg-line">
          <Stat label="Índice cultural" value={score(indice)} />
          <Stat label={`Brecha vs ${score(meta)}`} value={indice === null ? "–" : signedScore(indice - meta)} tone={toneText(indice === null ? null : indice - meta)} />
          <Stat label="Participación" value={part.esperados ? pct(cobertura) : "–"} hint={`${part.respondientes}/${part.esperados}`} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cs.map((c) => {
            const qcomp = qs.filter((q) => q.competenciaId === c.competenciaId);
            const gap = c.score === 0 ? null : c.score - c.objetivo;
            return (
              <div key={c.competenciaId} className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink-900">{c.nombre}</span>
                  <span className={`tnum font-mono text-[13px] font-semibold ${toneText(gap)}`}>
                    {score(c.score)}<span className="ml-1 text-[11px] font-normal text-ink-400">/ {score(c.objetivo)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full" style={{ width: `${(c.score / 5) * 100}%`, background: toneColor(gap) }} />
                </div>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {qcomp.map((q) => {
                    const dist = distDe(results, evaluado.id, q.id);
                    const n = nOf(dist);
                    const resultado = pctOf(dist);
                    const prom = avgOf(dist);
                    return (
                      <li key={q.id} className="rounded-[8px] bg-line-soft/50 p-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex-1 text-[12px] leading-snug text-ink-700">{q.texto}</span>
                          <span className="tnum shrink-0 font-mono text-[13px] font-semibold text-ink-900">
                            {resultado === null ? "–" : `${resultado}%`}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-400">{n} respuesta{n === 1 ? "" : "s"} · promedio {score(prom)}</p>
                        <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-line">
                          {dist.map((cnt, k) => cnt > 0 ? (
                            <div key={k} style={{ width: `${(cnt / Math.max(n, 1)) * 100}%`, background: ESCALA_COLORS[k] }} title={`${k + 1}: ${cnt}`} />
                          ) : null)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[12px] text-ink-500">
          <Users size={15} />
          Evaluado por sus {part.esperados} {evaluado.nivel === 1 ? "regionales" : evaluado.nivel === 2 ? "jefes" : "vendedores"} asignados · respuestas anónimas.
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, hint, tone = "text-ink-900" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`tnum font-mono text-[22px] font-semibold leading-tight ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}
