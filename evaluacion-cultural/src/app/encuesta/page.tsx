"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { Button, Skeleton, useToasts, ToastStack } from "@/components/ui";
import { competencias, evaluadosDeGrupo, GRUPOS_ENCUESTA, loadOrg, personas, preguntasActivas, type GrupoEncuesta } from "@/lib/data";
import { submitEncuesta, yaCompleto } from "@/lib/backend";
import { ESCALA, EDICION } from "@/lib/seed";
import type { Pregunta } from "@/lib/types";

function isGroup(value: string | null): value is GrupoEncuesta {
  return GRUPOS_ENCUESTA.some((group) => group.id === value);
}

function participantId(group: GrupoEncuesta, fresh = false) {
  const key = `ec_participante_${group}_v2`;
  if (fresh) window.localStorage.removeItem(key);
  let id = window.localStorage.getItem(key);
  if (!id) {
    const random = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    id = `grupo:${group}:${random}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function EncuestaPage() {
  const [group, setGroup] = useState<GrupoEncuesta | null>(null);
  const [ready, setReady] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    loadOrg().catch(() => {}).finally(() => {
      const queryGroup = new URLSearchParams(window.location.search).get("grupo");
      if (isGroup(queryGroup)) setGroup(queryGroup);
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="mx-auto max-w-md pt-10"><Skeleton className="h-64 w-full" /></div>;

  function enter(next: GrupoEncuesta) {
    window.history.replaceState(null, "", `/encuesta?grupo=${next}`);
    setGroup(next);
  }
  function exit() {
    window.history.replaceState(null, "", "/encuesta");
    setGroup(null);
  }

  if (!group) return <GroupGate onEnter={enter} />;
  return <Survey key={`${group}-${round}`} group={group} onExit={exit} onRestart={() => { participantId(group, true); setRound((n) => n + 1); }} />;
}

function GroupGate({ onEnter }: { onEnter: (group: GrupoEncuesta) => void }) {
  return (
    <div className="fade-rise mx-auto max-w-5xl pt-6 md:pt-12">
      <div className="max-w-3xl">
        <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-danger-600">Acceso por grupo</p>
        <h1 className="mt-4 text-[clamp(38px,6vw,68px)] font-extrabold leading-[1] tracking-[-0.03em] text-ink-900">Evaluación cultural 2026</h1>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-500">Selecciona el grupo al que perteneces. No necesitas código personal y tus respuestas se guardarán de forma anónima.</p>
        <div className="mt-4 flex items-start gap-2.5 text-[13px] text-ink-500"><ShieldCheck size={18} weight="fill" className="mt-px shrink-0 text-brand-600" />La plataforma no solicita tu nombre ni tu DNI.</div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {GRUPOS_ENCUESTA.map((group) => (
          <button key={group.id} onClick={() => onEnter(group.id)} className="group flex items-center gap-4 rounded-[16px] border border-line bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-[0_12px_30px_rgba(13,47,100,0.10)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600"><UsersThree size={25} weight="bold" /></span>
            <span><span className="block text-[17px] font-semibold text-ink-900">{group.label}</span><span className="mt-0.5 block text-[13px] text-ink-500">Ingresar a la encuesta</span></span>
            <ArrowRight size={18} weight="bold" className="ml-auto text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Survey({ group, onExit, onRestart }: { group: GrupoEncuesta; onExit: () => void; onRestart: () => void }) {
  const evaluated = useMemo(() => evaluadosDeGrupo(personas, group), [group]);
  const questions: Pregunta[] = useMemo(() => preguntasActivas(), []);
  const [submissionId] = useState(() => participantId(group));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [status, setStatus] = useState<"cargando" | "pendiente" | "hecho" | "enviando">("cargando");
  const { toasts, push, dismiss } = useToasts();
  const groupLabel = GRUPOS_ENCUESTA.find((item) => item.id === group)?.label ?? group;

  useEffect(() => {
    let active = true;
    yaCompleto(submissionId).then((done) => { if (active) setStatus(done ? "hecho" : "pendiente"); });
    return () => { active = false; };
  }, [submissionId]);

  if (!evaluated.length) return <Centered title="Este grupo no tiene líderes asignados" onExit={onExit}>Verifica la configuración con Gestión de Personas.</Centered>;
  if (!questions.length) return <Centered title="No hay preguntas activas" onExit={onExit}>Verifica el cuestionario en Administración.</Centered>;
  if (status === "cargando") return <div className="mx-auto max-w-3xl pt-10"><Skeleton className="h-64 w-full" /></div>;
  if (status === "hecho") return <Centered title="¡Gracias por tu evaluación!" icon onExit={onExit} secondaryLabel="Registrar otra respuesta de este grupo" onSecondary={onRestart}>Tus respuestas fueron registradas de forma anónima.</Centered>;

  const question = questions[questionIndex];
  const setCell = (evaluatedId: string, value: number) => setAnswers((previous) => ({ ...previous, [question.id]: { ...previous[question.id], [evaluatedId]: value } }));
  const questionComplete = (questionId: string) => evaluated.every((person) => answers[questionId]?.[person.id] !== undefined);
  const allReady = questions.every((item) => questionComplete(item.id));
  const completed = questions.filter((item) => questionComplete(item.id)).length;

  async function finish() {
    if (!allReady || status === "enviando") return;
    setStatus("enviando");
    const payload: Record<string, Record<string, number>> = {};
    for (const person of evaluated) {
      payload[person.id] = {};
      for (const item of questions) payload[person.id][item.id] = answers[item.id][person.id];
    }
    try {
      await submitEncuesta(submissionId, payload);
      setStatus("hecho");
    } catch {
      setStatus("pendiente");
      push("error", "No se pudo enviar. Revisa tu conexión e intenta nuevamente.");
    }
  }

  const competency = competencias.find((item) => item.id === question.competenciaId)?.nombre ?? "";
  return (
    <div className="fade-rise mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div><span className="text-[12px] font-semibold uppercase tracking-wide text-brand-600">Evaluación cultural {EDICION} · {groupLabel}</span><p className="text-[13px] text-ink-500">Evaluando a {evaluated.length} líderes</p></div>
        <button onClick={onExit} className="text-sm font-medium text-ink-500 hover:text-ink-900">Cambiar grupo</button>
      </div>
      <div className="rounded-[14px] border border-line bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{competency} · Pregunta {questionIndex + 1} de {questions.length}</p>
        <h1 className="mt-2 text-[22px] font-semibold leading-snug text-ink-900">{question.texto}</h1>
        <p className="mt-1.5 text-sm text-ink-500">Aplica el mismo criterio a cada líder según lo que hayas observado.</p>
      </div>
      <div className="flex flex-col gap-3">
        {evaluated.map((person) => {
          const value = answers[question.id]?.[person.id];
          return (
            <div key={person.id} className="rounded-[14px] border border-line bg-surface p-4">
              <div className="mb-3 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-ink-900 text-[13px] font-bold text-white">{person.nombre.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</div><div><p className="text-sm font-semibold text-ink-900">{person.nombre}</p><p className="text-[12px] text-ink-500">{person.cargo}</p></div><span className={`ml-auto text-[11px] font-semibold uppercase tracking-wide ${value !== undefined ? "text-ok-600" : "text-ink-400"}`}>{value !== undefined ? "Respondida" : "Pendiente"}</span></div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                {ESCALA.map((option) => <button key={option.value} onClick={() => setCell(person.id, option.value)} className={`rounded-[10px] border px-2 py-2.5 text-[12px] leading-tight transition-colors ${value === option.value ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"}`}><span className="tnum mr-1 font-mono font-semibold">{option.value}</span>{option.label}</button>)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-4 flex items-center gap-3 rounded-[14px] border border-line bg-surface/95 p-4 shadow-[0_8px_24px_rgba(23,23,26,0.08)] backdrop-blur"><span className="text-[13px] text-ink-500">{completed} de {questions.length} preguntas completas</span><div className="ml-auto flex items-center gap-2"><Button variant="secondary" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={questionIndex === 0}>Anterior</Button>{questionIndex < questions.length - 1 ? <Button variant="primary" onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={!questionComplete(question.id)}>Siguiente</Button> : <Button variant="primary" onClick={finish} disabled={!allReady || status === "enviando"}>{status === "enviando" ? "Enviando…" : "Finalizar y enviar"}</Button>}</div></div>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Centered({ title, children, icon, onExit, secondaryLabel, onSecondary }: { title: string; children: React.ReactNode; icon?: boolean; onExit: () => void; secondaryLabel?: string; onSecondary?: () => void }) {
  return <div className="mx-auto mt-16 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center">{icon && <CheckCircle size={44} weight="fill" className="mx-auto mb-3 text-ok-600" />}<h1 className="text-xl font-semibold text-ink-900">{title}</h1><p className="mt-2 text-sm text-ink-500">{children}</p>{secondaryLabel && onSecondary && <Button variant="primary" onClick={onSecondary} className="mt-5 w-full">{secondaryLabel}</Button>}<button onClick={onExit} className="mt-4 text-sm font-medium text-brand-600">Cambiar de grupo</button></div>;
}
