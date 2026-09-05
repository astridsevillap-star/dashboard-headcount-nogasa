"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, Plus, Trash, Users } from "@phosphor-icons/react";
import { Button, Select, Skeleton, TextInput, useToasts, ToastStack } from "@/components/ui";
import { areas as areasOf, evaluadoresDe, evaluadosDe, extraIds, loadOrg, NIVEL_LABEL, personas, regiones as regionesOf } from "@/lib/data";
import { clearAdminKey, clearOverride, deleteExtra, getAdminKey, setOverride, upsertExtra } from "@/lib/backend";
import type { Nivel, Persona } from "@/lib/types";

export default function OrganizacionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Persona | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const adminKey = getAdminKey();

  useEffect(() => {
    if (!adminKey) {
      router.replace("/login");
      return;
    }
    loadOrg()
      .then(() => setReady(true))
      .catch((e) => {
        if (String(e.message).includes("unauthorized")) {
          clearAdminKey();
          router.replace("/login");
        } else {
          push("error", "No se pudo cargar la organización.");
          setReady(true);
        }
      });
  }, [adminKey, router, push]);

  if (!adminKey) return null;
  if (!ready) return <Skeleton className="h-[420px] w-full" />;

  const filtro = q.trim().toLowerCase();
  const lista = personas.filter(
    (p) =>
      !filtro ||
      p.nombre.toLowerCase().includes(filtro) ||
      p.area.toLowerCase().includes(filtro) ||
      p.cargo.toLowerCase().includes(filtro) ||
      p.region.toLowerCase().includes(filtro)
  );
  const areaOpts = areasOf().length ? areasOf() : Array.from(new Set(personas.map((p) => p.area)));
  const regionOpts = Array.from(new Set(personas.map((p) => p.region).filter(Boolean)));

  async function save(p: Persona, nivel: Nivel, area: string, region: string) {
    if (!adminKey) return;
    try {
      await setOverride(adminKey, p.id, nivel, area, region, true);
      await loadOrg();
      setVersion((n) => n + 1);
      push("ok", `${p.nombre.split(" ")[0]}: actualizado.`);
    } catch {
      push("error", "No se pudo guardar el cambio.");
    }
  }

  async function excluir(p: Persona) {
    if (!adminKey) return;
    const esExtra = extraIds.has(p.id);
    if (!window.confirm(esExtra ? `¿Eliminar a ${p.nombre}?` : `¿Excluir a ${p.nombre}? Ya no evaluará ni será evaluado.`)) return;
    try {
      if (esExtra) await deleteExtra(adminKey, p.id);
      else await setOverride(adminKey, p.id, p.nivel, p.area, p.region, false);
      await loadOrg();
      setVersion((n) => n + 1);
      push("ok", esExtra ? "Persona eliminada." : "Persona excluida.");
    } catch {
      push("error", "No se pudo completar la acción.");
    }
  }

  async function restaurar(p: Persona) {
    if (!adminKey) return;
    try {
      await clearOverride(adminKey, p.id);
      await loadOrg();
      setVersion((n) => n + 1);
      push("ok", "Restaurado al valor original.");
    } catch {
      push("error", "No se pudo restaurar.");
    }
  }

  return (
    <div className="fade-rise flex flex-col gap-4" key={version}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Organización</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-500">
            Cambia el nivel, área o región de cualquier persona: quién evalúa a quién se recalcula
            solo, según la misma regla de cascada 90° ascendente.
          </p>
        </div>
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, cargo, área o región…" className="w-72" />
      </div>

      <section className="overflow-x-auto rounded-[12px] border border-line bg-surface">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-500">
              <th className="px-3 py-2.5 font-medium">Nombre</th>
              <th className="px-3 py-2.5 font-medium">Cargo</th>
              <th className="px-3 py-2.5 font-medium">Nivel</th>
              <th className="px-3 py-2.5 font-medium">Área</th>
              <th className="px-3 py-2.5 font-medium">Región</th>
              <th className="px-3 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <Row key={p.id} p={p} areaOpts={areaOpts} regionOpts={regionOpts} onSave={save} onExcluir={excluir} onRestaurar={restaurar} onPreview={() => setPreview(p)} />
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-ink-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <AddPersonForm adminKey={adminKey} areaOpts={areaOpts} onAdded={async () => { await loadOrg(); setVersion((n) => n + 1); }} push={push} />

      {preview && <RelationPreview persona={preview} onClose={() => setPreview(null)} />}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Row({
  p, areaOpts, regionOpts, onSave, onExcluir, onRestaurar, onPreview,
}: {
  p: Persona;
  areaOpts: string[];
  regionOpts: string[];
  onSave: (p: Persona, nivel: Nivel, area: string, region: string) => void;
  onExcluir: (p: Persona) => void;
  onRestaurar: (p: Persona) => void;
  onPreview: () => void;
}) {
  const [nivel, setNivel] = useState<Nivel>(p.nivel);
  const [area, setArea] = useState(p.area);
  const [region, setRegion] = useState(p.region);
  const dirty = nivel !== p.nivel || area !== p.area || region !== p.region;

  return (
    <tr className="border-t border-line-soft">
      <td className="px-3 py-2">
        <button onClick={onPreview} className="text-left font-medium text-ink-900 hover:text-brand-600">{p.nombre}</button>
        <p className="text-[11px] text-ink-400">DNI {p.dni}</p>
      </td>
      <td className="px-3 py-2 text-ink-500">{p.cargo}</td>
      <td className="px-3 py-2">
        <Select value={nivel} onChange={(e) => setNivel(Number(e.target.value) as Nivel)} className="h-9 text-[13px]">
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{NIVEL_LABEL[n as Nivel]}</option>)}
        </Select>
      </td>
      <td className="px-3 py-2">
        <input list="ec-areas" value={area} onChange={(e) => setArea(e.target.value)}
          className="h-9 w-40 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] hover:border-ink-300 focus:border-brand-600" />
      </td>
      <td className="px-3 py-2">
        <input list="ec-regiones" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="—"
          className="h-9 w-28 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] hover:border-ink-300 focus:border-brand-600" />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {dirty && (
            <Button variant="primary" size="sm" onClick={() => onSave(p, nivel, area.trim(), region.trim())}>Guardar</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onRestaurar(p)} title="Restaurar al valor original del Excel">
            <ArrowCounterClockwise size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onExcluir(p)} title="Excluir de la evaluación">
            <Trash size={14} />
          </Button>
        </div>
      </td>
      <datalist id="ec-areas">{areaOpts.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id="ec-regiones">{regionOpts.map((r) => <option key={r} value={r} />)}</datalist>
    </tr>
  );
}

function AddPersonForm({
  adminKey, areaOpts, onAdded, push,
}: {
  adminKey: string;
  areaOpts: string[];
  onAdded: () => Promise<void>;
  push: (k: "ok" | "error", t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [area, setArea] = useState(areaOpts[0] ?? "");
  const [nivel, setNivel] = useState<Nivel>(4);
  const [region, setRegion] = useState("");

  async function add() {
    if (!nombre.trim() || !area.trim()) return;
    const id = "px" + Date.now();
    try {
      await upsertExtra(adminKey, { id, dni: "", nombre: nombre.trim(), cargo: cargo.trim(), gerencia: "GERENCIA DE VENTAS B2C", area: area.trim(), nivel, region: region.trim() });
      await onAdded();
      setNombre(""); setCargo(""); setRegion("");
      push("ok", "Persona agregada.");
      setOpen(false);
    } catch {
      push("error", "No se pudo agregar.");
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="self-start">
        <Plus size={14} /> Agregar persona
      </Button>
    );
  }
  return (
    <section className="grid gap-2 rounded-[12px] border border-dashed border-ink-300 bg-surface p-5 sm:grid-cols-[1fr_1fr_140px_140px_auto]">
      <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
      <TextInput value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Cargo" />
      <Select value={area} onChange={(e) => setArea(e.target.value)}>
        {areaOpts.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      <Select value={nivel} onChange={(e) => setNivel(Number(e.target.value) as Nivel)}>
        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{NIVEL_LABEL[n as Nivel]}</option>)}
      </Select>
      <div className="flex gap-2">
        <Button variant="primary" onClick={add}>Agregar</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      <TextInput value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Región (opcional)" className="sm:col-span-2" />
    </section>
  );
}

/** Vista rápida de a quién evalúa / quién evalúa a esta persona, con las reglas vigentes. */
function RelationPreview({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const evaluadores = useMemo(() => evaluadoresDe(personas, persona), [persona]);
  const evaluadosList = useMemo(() => evaluadosDe(personas, persona), [persona]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/25 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-line bg-surface p-5 shadow-[0_24px_70px_rgba(13,47,100,0.18)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{persona.nombre}</p>
            <p className="text-[13px] text-ink-500">{persona.cargo} · {persona.area}{persona.region ? ` · ${persona.region}` : ""} · {NIVEL_LABEL[persona.nivel]}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900">✕</button>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-ink-500"><Users size={14} /> Lo evalúan ({evaluadores.length})</div>
        <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-700">
          {evaluadores.length === 0 && <li className="text-ink-400">Nadie (revisa el área/región asignada).</li>}
          {evaluadores.map((e) => <li key={e.id}>{e.nombre} <span className="text-ink-400">· {e.cargo}</span></li>)}
        </ul>
        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-ink-500"><Users size={14} /> Evalúa a ({evaluadosList.length})</div>
        <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-700">
          {evaluadosList.length === 0 && <li className="text-ink-400">A nadie (nivel 4 sin más niveles arriba, o sin destino asignado).</li>}
          {evaluadosList.map((e) => <li key={e.id}>{e.nombre} <span className="text-ink-400">· {e.cargo}</span></li>)}
        </ul>
      </div>
    </div>
  );
}
