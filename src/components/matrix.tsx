"use client";

import { useMemo, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import type { MatrixNode } from "@/lib/types";
import { num, signed } from "@/lib/format";

export type CellFilter = {
  period: string;
  dotacion?: string;
  categoria?: string;
  cargo?: string;
  label: string;
};

type FlatRow = { node: MatrixNode; hasChildren: boolean; expanded: boolean };

export function MatrixTable({
  nodes,
  totalNode,
  periods,
  labels,
  budgetAvailable,
  onCellClick,
  expandSignal,
}: {
  nodes: MatrixNode[];
  totalNode: MatrixNode;
  periods: string[];
  labels: Record<string, string>;
  budgetAvailable: boolean;
  onCellClick: (f: CellFilter) => void;
  /** contador que fuerza expandir (+n) o colapsar (-n) todo */
  expandSignal: number;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [lastSignal, setLastSignal] = useState(0);

  // expandir / colapsar todo desde la barra superior
  if (expandSignal !== lastSignal) {
    setLastSignal(expandSignal);
    if (expandSignal > lastSignal) {
      const all = new Set<string>();
      const walk = (list: MatrixNode[]) => {
        for (const n of list) {
          if (n.children.length > 0) all.add(n.key);
          walk(n.children);
        }
      };
      walk(nodes);
      setOpen(all);
    } else {
      setOpen(new Set());
    }
  }

  const flat = useMemo(() => {
    const out: FlatRow[] = [];
    const walk = (list: MatrixNode[]) => {
      for (const n of list) {
        const expanded = open.has(n.key);
        out.push({ node: n, hasChildren: n.children.length > 0, expanded });
        if (expanded) walk(n.children);
      }
    };
    walk(nodes);
    return out;
  }, [nodes, open]);

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="matrix-scroll max-h-[620px] overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 min-w-[260px] border-b border-line bg-surface px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-wide text-ink-500 sm:min-w-[300px]">
              Dotación / Categoría / Cargo
            </th>
            {budgetAvailable && (
              <th className="sticky top-0 z-20 min-w-[72px] border-b border-l border-line bg-brand-25 px-3 py-2.5 text-right text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                Ppto.
              </th>
            )}
            {periods.map((p) => (
              <th
                key={p}
                className="sticky top-0 z-20 min-w-[74px] border-b border-line bg-surface px-3 py-2.5 text-right text-[11.5px] font-medium uppercase tracking-wide text-ink-500"
              >
                {labels[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row
            row={{ node: totalNode, hasChildren: false, expanded: false }}
            periods={periods}
            budgetAvailable={budgetAvailable}
            onCellClick={onCellClick}
            toggle={toggle}
            isTotal
          />
          {flat.map((r) => (
            <Row
              key={r.node.key}
              row={r}
              periods={periods}
              budgetAvailable={budgetAvailable}
              onCellClick={onCellClick}
              toggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  periods,
  budgetAvailable,
  onCellClick,
  toggle,
  isTotal = false,
}: {
  row: FlatRow;
  periods: string[];
  budgetAvailable: boolean;
  onCellClick: (f: CellFilter) => void;
  toggle: (key: string) => void;
  isTotal?: boolean;
}) {
  const { node, hasChildren, expanded } = row;
  const level = node.level;

  const rowStyles = isTotal
    ? "bg-line-soft/70 font-semibold"
    : level === 0
      ? "bg-line-soft/40 font-semibold"
      : level === 1
        ? "font-medium"
        : "";
  const labelColor = isTotal || level === 0 ? "text-ink-900" : level === 1 ? "text-ink-700" : "text-ink-500";
  const stickyBg = isTotal
    ? "bg-[#f2f2f4]"
    : level === 0
      ? "bg-[#f5f5f6]"
      : "bg-surface";

  return (
    <tr className={rowStyles}>
      <td
        className={`sticky left-0 z-10 border-b border-line-soft px-2 py-0 ${stickyBg}`}
      >
        <div
          className="flex min-h-[42px] items-center gap-1"
          style={{ paddingLeft: isTotal ? 8 : level * 18 + (hasChildren ? 0 : 22) }}
        >
          {hasChildren && (
            <button
              onClick={() => toggle(node.key)}
              aria-label={expanded ? "Colapsar" : "Expandir"}
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-ink-400 transition-colors hover:bg-line-soft hover:text-ink-900"
            >
              <CaretRight
                size={12}
                weight="bold"
                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          <span
            className={`truncate pr-3 ${labelColor}`}
            title={node.label}
            style={{ maxWidth: 300 }}
          >
            {node.label}
          </span>
        </div>
      </td>

      {budgetAvailable && (
        <td className="tnum border-b border-l border-line-soft bg-brand-25/60 px-3 text-right font-mono text-[12.5px] text-ink-700">
          {node.budget > 0 ? num(node.budget) : "–"}
        </td>
      )}

      {periods.map((p) => {
        const hc = node.hc[p];
        const has = hc !== undefined;
        const relevant = has || node.budget > 0;
        const delta = budgetAvailable && relevant ? (hc ?? 0) - node.budget : null;

        // semáforo: rojo = déficit, ámbar = superávit, verde solo cuando HC = presupuesto
        const cellBg =
          delta === null
            ? "hover:bg-brand-50"
            : delta < 0
              ? "bg-danger-50 hover:bg-danger-100"
              : delta > 0
                ? "bg-warn-50 hover:bg-warn-100"
                : "bg-ok-50 hover:bg-ok-100";
        const deltaColor =
          delta === null
            ? ""
            : delta < 0
              ? "text-danger-600"
              : delta > 0
                ? "text-warn-600"
                : "text-ok-600";
        return (
          <td key={p} className="border-b border-line-soft p-0">
            <button
              onClick={() =>
                onCellClick({
                  period: p,
                  dotacion: isTotal ? undefined : node.dotacion,
                  categoria: node.categoria,
                  cargo: node.cargo,
                  label: node.label,
                })
              }
              className={`block h-full w-full px-3 py-1.5 text-right transition-colors ${cellBg}`}
              title="Ver detalle de personas"
            >
              <span className={`tnum block font-mono text-[12.5px] ${has ? "text-ink-900" : "text-ink-300"}`}>
                {has ? num(hc) : "–"}
              </span>
              {budgetAvailable && (
                <span className={`tnum block font-mono text-[10.5px] font-medium leading-tight ${deltaColor}`}>
                  {delta !== null && (has || node.budget > 0)
                    ? delta === 0
                      ? "="
                      : signed(delta)
                    : " "}
                </span>
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
