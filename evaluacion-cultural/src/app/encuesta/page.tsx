"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle, LockSimple, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { Button, TextInput, Skeleton, useToasts, ToastStack } from "@/components/ui";
import {
  audienciaDe,
  codeMap,
  competencias,
  evaluadosDe,
  loadOrg,
  personas,
  preguntasActivas,
} from "@/lib/data";
import { normalizeCode } from "@/lib/codes";
import { submitEncuesta, yaCompleto } from "@/lib/backend";
import { ESCALA, EDICION } from "@/lib/seed";
import type { Persona, Pregunta } from "@/lib/types";

const SESSION = "ec_evaluador_v1";

export default function EncuestaPage() {
  const [evaluadorId, setEvaluadorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadOrg()
      .catch(() => {}) // si falla, se usa el padrón base ya cargado en memoria
      .finally(() => {
        try {
          const saved = window.localStorage.getItem(SESSION);
          if (saved && personas.some((p) => p.id === saved)) setEvaluadorId(saved);
        } catch { /* noop */ }
        setReady(true);
      });
  }, []);

  if (!ready) return <div className="mx-auto max-w-md pt-10"><Skeleton className="h-64 w-full" /></div>;

  const evaluador = personas.find((p) => p.id === evaluadorId) ?? null;
  const salir = () => {
    try { window.localStorage.removeItem(SESSION); } catch { /* noop */ }
    setEvaluadorId(null);
  };

  if (!evaluador)
    return <CodeGate onEnter={(id) => { try { window.localStorage.setItem(SESSION, id); } catch { /* noop */ } setEvaluadorId(id); }} />;

  return <Survey evaluador={evaluador} onExit={salir} />;
}

function CodeGate({ onEnter }: { onEnter: (id: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const map = useMemo(() => codeMap(), []);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const id = map.byCode.get(normalizeCode(code));
    if (!id) { setError("Código no válido. Revisa el código que recibiste."); return; }
    onEnter(id);
  }
  return (
    <div className="fade-rise mx-auto grid max-w-6xl items-center gap-10 px-1 pt-6 md:min-h-[calc(100dvh-160px)] md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:pt-10">
      {/* titular */}
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-danger-600">Acceso restringido</p>
        <h1 className="mt-5 text-[clamp(44px,7vw,76px)] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink-900" style={{ textWrap: "balance" }}>
          Una mirada al liderazgo cultural.
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-500">
          Esta evaluación es confidencial y está dirigida al equipo de ventas. Con tu código
          evalúas a tus líderes en las cinco competencias culturales.
        </p>
        <div className="mt-8 flex items-start gap-2.5 text-[13px] text-ink-500">
          <ShieldCheck size={18} weight="fill" className="mt-px shrink-0 text-brand-600" />
          El código personal solo registra tu participación; no se guarda con tus respuestas.
        </div>
      </div>

      {/* tarjeta de ingreso */}
      <div className="rounded-[22px] border border-line bg-surface p-7 shadow-[0_24px_70px_rgba(13,47,100,0.12)] sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
          <LockSimple size={24} weight="bold" />
        </span>
        <h2 className="mt-5 text-[24px] font-bold tracking-tight text-ink-900">Ingresa tu código personal</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
          Usa el código que recibiste para completar una sola evaluación.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">Código personal</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
              required
              className="h-12 w-full rounded-[10px] border border-line bg-surface px-4 text-[16px] font-semibold uppercase tracking-[0.18em] text-ink-900 outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-600"
            />
          </div>
          <button
            type="submit"
            disabled={!code.trim()}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink-900 text-[15px] font-semibold text-white transition-all hover:bg-ink-700 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-40"
          >
            Ingresar
            <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
        <button
          onClick={() => { setCode(""); setError(""); }}
          className="mt-5 block w-full text-center text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

function Survey({ evaluador, onExit }: { evaluador: Persona; onExit: () => void }) {
  const evaluadosList = useMemo(() => evaluadosDe(personas, evaluador), [evaluador]);
  const preguntas: Pregunta[] = useMemo(
    () => (evaluadosList.length ? preguntasActivas(audienciaDe(evaluadosList[0].nivel)) : []),
    [evaluadosList]
  );
  const [qi, setQi] = useState(0);
  const [resp, setResp] = useState<Record<string, Record<string, number>>>({});
  const [estado, setEstado] = useState<"cargando" | "pendiente" | "hecho" | "enviando">("cargando");
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    let active = true;
    yaCompleto(evaluador.id).then((done) => {
      if (active) setEstado(done ? "hecho" : "pendiente");
    });
    return () => { active = false; };
  }, [evaluador.id]);

  if (evaluadosList.length === 0)
    return <Centered title="No tienes personas asignadas" onExit={onExit}>Con este código no hay evaluaciones pendientes. Verifica con Gestión de Personas.</Centered>;
  if (estado === "cargando")
    return <div className="mx-auto max-w-3xl pt-10"><Skeleton className="h-64 w-full" /></div>;
  if (estado === "hecho")
    return <Centered title="¡Gracias por tu evaluación!" icon onExit={onExit}>Tus respuestas ya fueron registradas de forma anónima. Puedes cerrar esta ventana.</Centered>;

  const q = preguntas[qi];
  const setCell = (evId: string, v: number) => setResp((prev) => ({ ...prev, [q.id]: { ...prev[q.id], [evId]: v } }));
  const conductaCompleta = (pid: string) => evaluadosList.every((e) => resp[pid]?.[e.id] !== undefined);
  const todoListo = preguntas.every((p) => conductaCompleta(p.id));
  const done = preguntas.filter((p) => conductaCompleta(p.id)).length;

  async function finalizar() {
    if (!todoListo || estado === "enviando") return;
    setEstado("enviando");
    const answers: Record<string, Record<string, number>> = {};
    for (const ev of evaluadosList) {
      answers[ev.id] = {};
      for (const p of preguntas) {
        const v = resp[p.id]?.[ev.id];
        if (v && v > 0) answers[ev.id][p.id] = v;
      }
    }
    try {
      const r = await submitEncuesta(evaluador.id, answers);
      setEstado("hecho");
      if (r === "already") push("ok", "Ya habías respondido; no se duplicó.");
    } catch {
      setEstado("pendiente");
      push("error", "No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
  }

  const compNombre = competencias.find((c) => c.id === q.competenciaId)?.nombre ?? "";

  return (
    <div className="fade-rise mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-wide text-brand-600">Evaluación cultural {EDICION}</span>
          <p className="text-[13px] text-ink-500">Evaluando a {evaluadosList.length === 1 ? evaluadosList[0].nombre : `${evaluadosList.length} líderes de tu área`}</p>
        </div>
        <button onClick={onExit} className="text-sm font-medium text-ink-500 hover:text-ink-900">Salir</button>
      </div>

      <div className="rounded-[14px] border border-line bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{compNombre} · Conducta {qi + 1} de {preguntas.length}</p>
        <h1 className="mt-2 text-[22px] font-semibold leading-snug text-ink-900" style={{ textWrap: "balance" }}>{q.texto}</h1>
        <p className="mt-1.5 text-sm text-ink-500">Aplica este mismo criterio a cada persona para comparar lo que has observado.</p>
      </div>

      <div className="flex flex-col gap-3">
        {evaluadosList.map((ev) => {
          const val = resp[q.id]?.[ev.id];
          return (
            <div key={ev.id} className="rounded-[14px] border border-line bg-surface p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-ink-900 text-[13px] font-bold text-white">
                  {ev.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{ev.nombre}</p>
                  <p className="text-[12px] text-ink-500">{ev.cargo}</p>
                </div>
                <span className={`ml-auto text-[11px] font-semibold uppercase tracking-wide ${val !== undefined ? "text-ok-600" : "text-ink-400"}`}>
                  {val !== undefined ? "Respondida" : "Pendiente"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {ESCALA.map((op) => (
                  <button key={op.value} onClick={() => setCell(ev.id, op.value)}
                    className={`rounded-[10px] border px-2 py-2.5 text-[13px] transition-colors ${val === op.value ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"}`}>
                    <span className="tnum mr-1 font-mono font-semibold">{op.value}</span>{op.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setCell(ev.id, 0)}
                className={`mt-2 w-full rounded-[10px] border px-3 py-2 text-[12px] transition-colors ${val === 0 ? "border-ink-400 bg-line-soft text-ink-700" : "border-line text-ink-400 hover:border-ink-300 hover:text-ink-700"}`}>
                No tengo suficiente información para evaluar esta conducta
              </button>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-[14px] border border-line bg-surface/95 p-4 shadow-[0_8px_24px_rgba(23,23,26,0.08)] backdrop-blur">
        <span className="text-[13px] text-ink-500">{done} de {preguntas.length} conductas completas</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => setQi((n) => Math.max(0, n - 1))} disabled={qi === 0}>Anterior</Button>
          {qi < preguntas.length - 1 ? (
            <Button variant="primary" onClick={() => setQi((n) => Math.min(preguntas.length - 1, n + 1))} disabled={!conductaCompleta(q.id)}>Siguiente</Button>
          ) : (
            <Button variant="primary" onClick={finalizar} disabled={!todoListo || estado === "enviando"}>
              {estado === "enviando" ? "Enviando…" : "Finalizar y enviar"}
            </Button>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Centered({ title, children, icon, onExit }: { title: string; children: React.ReactNode; icon?: boolean; onExit: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center">
      {icon && <CheckCircle size={44} weight="fill" className="mx-auto mb-3 text-ok-600" />}
      <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">{children}</p>
      <button onClick={onExit} className="mt-5 text-sm font-medium text-brand-600">Ingresar con otro código</button>
    </div>
  );
}
