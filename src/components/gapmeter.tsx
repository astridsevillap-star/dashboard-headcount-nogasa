"use client";

import { num, signed } from "@/lib/format";

export type GapRow = {
  name: string;
  hc: number;
  presupuesto: number | null;
};

/**
 * Medidor de brecha por dotación: barra azul = dotación actual, segmento rojo =
 * vacantes contra presupuesto, segmento ámbar = exceso, tick oscuro = presupuesto.
 * Verde solo cuando dotación = presupuesto.
 */
export function GapMeters({
  rows,
  onRowClick,
}: {
  rows: GapRow[];
  onRowClick?: (name: string) => void;
}) {
  const scale = Math.max(
    ...rows.map((r) => Math.max(r.hc, r.presupuesto ?? 0)),
    1
  );

  const sorted = [...rows].sort((a, b) => {
    const da = a.presupuesto === null ? Number.POSITIVE_INFINITY : a.hc - a.presupuesto;
    const db = b.presupuesto === null ? Number.POSITIVE_INFINITY : b.hc - b.presupuesto;
    if (da !== db) return da - db;
    return b.hc - a.hc;
  });

  return (
    <div className="flex flex-col">
      {sorted.map((r) => {
        const ppto = r.presupuesto;
        const delta = ppto === null ? null : r.hc - ppto;
        const pct = (v: number) => `${(v / scale) * 100}%`;
        const fillEnd = ppto === null ? r.hc : Math.min(r.hc, ppto);

        const chip =
          delta === null ? null : delta < 0 ? (
            <span className="tnum inline-block min-w-[44px] rounded-full bg-danger-50 px-2 py-0.5 text-center font-mono text-[11.5px] font-semibold text-danger-600">
              {signed(delta)}
            </span>
          ) : delta > 0 ? (
            <span className="tnum inline-block min-w-[44px] rounded-full bg-warn-50 px-2 py-0.5 text-center font-mono text-[11.5px] font-semibold text-warn-600">
              {signed(delta)}
            </span>
          ) : (
            <span className="tnum inline-block min-w-[44px] rounded-full bg-ok-50 px-2 py-0.5 text-center font-mono text-[11.5px] font-semibold text-ok-600">
              =
            </span>
          );

        const inner = (
          <>
            <span
              className="w-[118px] shrink-0 truncate text-left text-[11.5px] font-medium text-ink-700"
              title={r.name}
            >
              {r.name}
            </span>

            <span className="relative block h-4 min-w-0 flex-1">
              {/* dotación actual */}
              {fillEnd > 0 && (
                <span
                  className="absolute inset-y-0 left-0 rounded-[4px] bg-brand-600"
                  style={{ width: pct(fillEnd) }}
                />
              )}
              {/* vacantes: déficit contra presupuesto */}
              {ppto !== null && r.hc < ppto && (
                <span
                  className="absolute inset-y-0 rounded-r-[4px] border-l-2 border-surface bg-danger-500/30"
                  style={{ left: pct(r.hc), width: `calc(${pct(ppto - r.hc)})` }}
                />
              )}
              {/* exceso sobre presupuesto */}
              {ppto !== null && r.hc > ppto && (
                <span
                  className="absolute inset-y-0 rounded-r-[4px] border-l-2 border-surface bg-warn-600"
                  style={{ left: pct(ppto), width: `calc(${pct(r.hc - ppto)})` }}
                />
              )}
              {/* tick de presupuesto */}
              {ppto !== null && ppto > 0 && (
                <span
                  className="absolute -inset-y-0.5 w-[2.5px] rounded-full bg-ink-700"
                  style={{ left: `calc(${pct(ppto)} - 1.25px)` }}
                />
              )}
            </span>

            <span className="tnum w-[86px] shrink-0 text-right font-mono text-[12px] text-ink-900">
              {num(r.hc)}
              {ppto !== null && (
                <span className="text-ink-400"> / {num(ppto)}</span>
              )}
            </span>

            <span className="w-[52px] shrink-0 text-right">{chip}</span>
          </>
        );

        return onRowClick ? (
          <button
            key={r.name}
            onClick={() => onRowClick(r.name)}
            title="Ver detalle de personas"
            className="flex w-full items-center gap-3 rounded-[8px] px-2 py-[7px] text-left transition-colors hover:bg-brand-25"
          >
            {inner}
          </button>
        ) : (
          <div key={r.name} className="flex w-full items-center gap-3 px-2 py-[7px]">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function GapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {[
        { label: "Dotación", cls: "h-2.5 w-2.5 rounded-[3px] bg-brand-600" },
        { label: "Déficit", cls: "h-2.5 w-2.5 rounded-[3px] bg-danger-500/30" },
        { label: "Exceso", cls: "h-2.5 w-2.5 rounded-[3px] bg-warn-600" },
        { label: "Ppto.", cls: "h-3 w-[2.5px] rounded-full bg-ink-700" },
      ].map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className={it.cls} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
