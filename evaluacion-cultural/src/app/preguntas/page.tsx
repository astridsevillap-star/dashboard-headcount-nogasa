"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, Check, FloppyDisk } from "@phosphor-icons/react";
import { Button, Select, Skeleton, ToastStack, useToasts } from "@/components/ui";
import { clearAdminKey, getAdminKey, replaceQuestions, type PreguntaConfig } from "@/lib/backend";
import { competencias, loadOrg, preguntas } from "@/lib/data";
import { PREGUNTAS } from "@/lib/seed";

const defaults = () => PREGUNTAS.filter((item) => item.audiencia === "gerencial").map((item, index) => ({ id: item.id, competencia_id: item.competenciaId, texto: item.texto, activa: item.activa, orden: index + 1 }));

export default function PreguntasPage() {
  const router = useRouter();
  const adminKey = getAdminKey();
  const [items, setItems] = useState<PreguntaConfig[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    if (!adminKey) { router.replace("/login"); return; }
    loadOrg().then(() => {
      setItems(preguntas.map((item, index) => ({ id: item.id, competencia_id: item.competenciaId, texto: item.texto, activa: item.activa, orden: index + 1 })));
      setReady(true);
    }).catch((error) => {
      if (String(error.message).includes("unauthorized")) { clearAdminKey(); router.replace("/login"); }
      else { setItems(defaults()); setReady(true); push("error", "No se pudo cargar la configuración guardada."); }
    });
  }, [adminKey, router, push]);

  if (!adminKey) return null;
  if (!ready) return <Skeleton className="h-[420px] w-full" />;

  function update(index: number, patch: Partial<PreguntaConfig>) {
    setItems((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  }

  async function save() {
    if (items.some((item) => !item.texto.trim())) { push("error", "Ninguna pregunta puede quedar vacía."); return; }
    setSaving(true);
    try {
      const normalized = items.map((item, index) => ({ ...item, texto: item.texto.trim(), orden: index + 1 }));
      await replaceQuestions(adminKey!, normalized);
      await loadOrg();
      setItems(normalized);
      push("ok", "Cuestionario actualizado correctamente.");
    } catch { push("error", "No se pudieron guardar las preguntas."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-rise flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[22px] font-semibold text-ink-900">Afirmaciones del pulso</h1><p className="mt-1 max-w-2xl text-sm text-ink-500">Contenido único de 20 afirmaciones para todos los líderes. Puedes editar el texto, cambiar la competencia o desactivar afirmaciones.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setItems(defaults())}><ArrowCounterClockwise size={15} /> Restaurar texto original</Button><Button variant="primary" onClick={save} disabled={saving}><FloppyDisk size={15} /> {saving ? "Guardando…" : "Guardar cambios"}</Button></div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <section key={item.id} className={`rounded-[12px] border bg-surface p-4 ${item.activa ? "border-line" : "border-line bg-line-soft/40 opacity-75"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-mono text-[13px] font-semibold text-brand-700">{index + 1}</span>
              <Select value={item.competencia_id} onChange={(event) => update(index, { competencia_id: event.target.value })}>{competencias.map((competency) => <option key={competency.id} value={competency.id}>{competency.nombre}</option>)}</Select>
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-600"><input type="checkbox" checked={item.activa} onChange={(event) => update(index, { activa: event.target.checked })} className="h-4 w-4 accent-brand-600" />{item.activa ? <><Check size={14} /> Activa</> : "Inactiva"}</label>
            </div>
            <textarea value={item.texto} onChange={(event) => update(index, { texto: event.target.value })} rows={2} className="mt-3 w-full resize-y rounded-[9px] border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink-900 outline-none hover:border-ink-300 focus:border-brand-600" />
          </section>
        ))}
      </div>
      <div className="flex justify-end"><Button variant="primary" onClick={save} disabled={saving}><FloppyDisk size={15} /> {saving ? "Guardando…" : "Guardar cambios"}</Button></div>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
