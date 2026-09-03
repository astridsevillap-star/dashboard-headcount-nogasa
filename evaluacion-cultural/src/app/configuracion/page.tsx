"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash, Plus } from "@phosphor-icons/react";
import { Button, Segmented, Select, Skeleton, TextInput, useToasts, ToastStack } from "@/components/ui";
import { competencias, loadStore, mutate, NIVEL_LABEL } from "@/lib/data";
import type { Audiencia, Nivel, Persona, Pregunta } from "@/lib/types";

export default function ConfiguracionPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"preguntas" | "personas">("preguntas");
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    loadStore();
    setReady(true);
  }, []);

  if (!ready) return <Skeleton className="h-[420px] w-full" />;

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Configuración</h1>
          <p className="mt-0.5 text-sm text-ink-500">Edita preguntas y personas sin cambiar el código del sitio.</p>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "preguntas", label: "Preguntas" },
            { value: "personas", label: "Personas" },
          ]}
        />
      </div>

      {tab === "preguntas" ? <Preguntas push={push} /> : <Personas push={push} />}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

/* ---------------- Preguntas ---------------- */

function Preguntas({ push }: { push: (k: "ok" | "error", t: string) => void }) {
  const [audiencia, setAudiencia] = useState<Audiencia>("general");
  const [version, setVersion] = useState(0);
  const [nuevaComp, setNuevaComp] = useState(competencias[0].id);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const store = loadStore();

  const preguntas = store.preguntas.filter((q) => q.audiencia === audiencia);

  function toggle(id: string) {
    mutate((s) => {
      const q = s.preguntas.find((x) => x.id === id);
      if (q) q.activa = !q.activa;
    });
    setVersion((n) => n + 1);
  }
  function setTexto(id: string, texto: string) {
    mutate((s) => {
      const q = s.preguntas.find((x) => x.id === id);
      if (q) q.texto = texto;
    });
  }
  function remove(id: string) {
    mutate((s) => {
      s.preguntas = s.preguntas.filter((x) => x.id !== id);
    });
    setVersion((n) => n + 1);
    push("ok", "Pregunta eliminada.");
  }
  function add(e: FormEvent) {
    e.preventDefault();
    if (!nuevoTexto.trim()) return;
    mutate((s) => {
      s.preguntas.push({
        id: `q${Date.now()}`,
        competenciaId: nuevaComp,
        audiencia,
        texto: nuevoTexto.trim(),
        activa: true,
      });
    });
    setNuevoTexto("");
    setVersion((n) => n + 1);
    push("ok", "Pregunta añadida.");
  }

  return (
    <div className="flex flex-col gap-4" key={version}>
      <div className="flex items-center gap-3">
        <Segmented
          value={audiencia}
          onChange={setAudiencia}
          options={[
            { value: "general", label: "Nivel 2·3·4 (8 preguntas)" },
            { value: "gerencial", label: "Nivel 1 · Gerente (20)" },
          ]}
        />
        <span className="text-[12px] text-ink-500">
          {preguntas.filter((q) => q.activa).length} activas de {preguntas.length}
        </span>
      </div>

      {competencias.map((c) => {
        const qs = preguntas.filter((q) => q.competenciaId === c.id);
        return (
          <section key={c.id} className="rounded-[12px] border border-line bg-surface p-5">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-900">{c.nombre}</h2>
            <div className="flex flex-col gap-2.5">
              {qs.map((q) => (
                <QuestionRow key={q.id} q={q} onToggle={() => toggle(q.id)} onText={(t) => setTexto(q.id, t)} onRemove={() => remove(q.id)} />
              ))}
              {qs.length === 0 && <p className="text-[12px] text-ink-400">Sin preguntas.</p>}
            </div>
          </section>
        );
      })}

      <form onSubmit={add} className="grid gap-2 rounded-[12px] border border-dashed border-ink-300 bg-surface p-5 sm:grid-cols-[180px_1fr_auto]">
        <Select value={nuevaComp} onChange={(e) => setNuevaComp(e.target.value)}>
          {competencias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>
        <TextInput value={nuevoTexto} onChange={(e) => setNuevoTexto(e.target.value)} placeholder="Redacta una conducta observable y concreta." />
        <Button variant="primary" type="submit"><Plus size={14} /> Añadir</Button>
      </form>
    </div>
  );
}

function QuestionRow({
  q,
  onToggle,
  onText,
  onRemove,
}: {
  q: Pregunta;
  onToggle: () => void;
  onText: (t: string) => void;
  onRemove: () => void;
}) {
  const [texto, setLocal] = useState(q.texto);
  return (
    <div className="flex items-start gap-2.5 rounded-[8px] border border-line-soft p-2.5">
      <TextInput
        className="h-auto min-h-9 flex-1 py-2"
        value={texto}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => texto !== q.texto && onText(texto)}
      />
      <button
        onClick={onToggle}
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${q.activa ? "bg-ok-50 text-ok-600" : "bg-line-soft text-ink-500"}`}
      >
        {q.activa ? "Activa" : "Inactiva"}
      </button>
      <button onClick={onRemove} className="shrink-0 p-1 text-ink-400 hover:text-danger-600" aria-label="Eliminar">
        <Trash size={15} />
      </button>
    </div>
  );
}

/* ---------------- Personas ---------------- */

function Personas({ push }: { push: (k: "ok" | "error", t: string) => void }) {
  const [version, setVersion] = useState(0);
  const [q, setQ] = useState("");
  const store = loadStore();

  const filtro = q.trim().toLowerCase();
  const lista = store.personas.filter(
    (p) =>
      !filtro ||
      p.nombre.toLowerCase().includes(filtro) ||
      p.area.toLowerCase().includes(filtro) ||
      p.cargo.toLowerCase().includes(filtro)
  );

  function setField(id: string, field: keyof Persona, value: string | number) {
    mutate((s) => {
      const p = s.personas.find((x) => x.id === id);
      if (p) (p as unknown as Record<string, unknown>)[field] = value;
    });
  }
  function remove(id: string) {
    mutate((s) => {
      s.personas = s.personas.filter((x) => x.id !== id);
    });
    setVersion((n) => n + 1);
    push("ok", "Persona eliminada.");
  }
  function add() {
    const id = `p${Date.now()}`;
    mutate((s) => {
      s.personas.push({
        id, dni: "", nombre: "Nueva persona", cargo: "", gerencia: "GERENCIA DE VENTAS B2C",
        area: store.personas[0]?.area ?? "VENTAS DETALLE", nivel: 4, region: "",
      });
    });
    setVersion((n) => n + 1);
  }

  const areaOpts = Array.from(new Set(store.personas.map((p) => p.area)));
  const regionOpts = Array.from(new Set(store.personas.map((p) => p.region).filter(Boolean)));

  return (
    <div className="flex flex-col gap-3" key={version}>
      <div className="flex items-center gap-2">
        <TextInput className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, área o cargo…" />
        <Button variant="primary" onClick={add}><Plus size={14} /> Agregar persona</Button>
      </div>
      <p className="text-[12px] text-ink-500">{store.personas.length} personas en el padrón · {store.personas.filter((p) => p.nivel <= 3).length} evaluadas (N1–N3).</p>

      <section className="overflow-x-auto rounded-[12px] border border-line bg-surface">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-500">
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Cargo</th>
              <th className="px-3 py-2 font-medium">Área</th>
              <th className="px-3 py-2 font-medium">Región</th>
              <th className="px-3 py-2 font-medium">Nivel</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-t border-line-soft">
                <td className="px-3 py-1.5">
                  <input defaultValue={p.nombre} onBlur={(e) => setField(p.id, "nombre", e.target.value)} className="w-44 rounded-[6px] border border-transparent bg-transparent px-1.5 py-1 hover:border-line focus:border-brand-600" />
                </td>
                <td className="px-3 py-1.5">
                  <input defaultValue={p.cargo} onBlur={(e) => setField(p.id, "cargo", e.target.value)} className="w-48 rounded-[6px] border border-transparent bg-transparent px-1.5 py-1 hover:border-line focus:border-brand-600" />
                </td>
                <td className="px-3 py-1.5">
                  <select defaultValue={p.area} onChange={(e) => setField(p.id, "area", e.target.value)} className="rounded-[6px] border border-line bg-surface px-1.5 py-1">
                    {areaOpts.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <select defaultValue={p.region} onChange={(e) => setField(p.id, "region", e.target.value)} className="rounded-[6px] border border-line bg-surface px-1.5 py-1">
                    <option value="">—</option>
                    {regionOpts.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <select defaultValue={p.nivel} onChange={(e) => setField(p.id, "nivel", Number(e.target.value) as Nivel)} className="rounded-[6px] border border-line bg-surface px-1.5 py-1">
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{NIVEL_LABEL[n as Nivel]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={() => remove(p.id)} className="p-1 text-ink-400 hover:text-danger-600" aria-label="Eliminar"><Trash size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
