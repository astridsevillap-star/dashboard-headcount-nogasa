"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { Button, Skeleton, useToasts, ToastStack } from "@/components/ui";
import { competencias, evaluadosDeGrupo, evaluadosDeSegmentoLider, GRUPOS_ENCUESTA, loadOrg, personas, preguntasActivas, SEGMENTOS_LIDERES, type GrupoEncuesta, type SegmentoLider } from "@/lib/data";
import { submitEncuesta, yaCompleto } from "@/lib/backend";
import { ESCALA, EDICION } from "@/lib/seed";
import type { Pregunta } from "@/lib/types";

function isGroup(value: string | null): value is GrupoEncuesta {
  return GRUPOS_ENCUESTA.some((group) => group.id === value);
}

function isLeaderSegment(value: string | null): value is SegmentoLider {
  return SEGMENTOS_LIDERES.some((segment) => segment.id === value);
}

function participantId(group: GrupoEncuesta, segment: SegmentoLider | null, fresh = false) {
  const key = `ec_participante_${group}_${segment ?? "general"}_v3`;
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
  const [leaderSegment, setLeaderSegment] = useState<SegmentoLider | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [ready, setReady] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    loadOrg().catch(() => {}).finally(() => {
      const params = new URLSearchParams(window.location.search);
      const queryGroup = params.get("grupo");
      const querySegment = params.get("segmento");
      if (isGroup(queryGroup)) setGroup(queryGroup);
      if (isLeaderSegment(querySegment)) setLeaderSegment(querySegment);
      if (isGroup(queryGroup) || params.get("inicio") === "1") setShowInstructions(false);
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="mx-auto max-w-md pt-10"><Skeleton className="h-64 w-full" /></div>;

  function enter(next: GrupoEncuesta) {
    window.history.replaceState(null, "", `/encuesta?grupo=${next}`);
    setGroup(next);
  }
  function start() {
    window.history.replaceState(null, "", "/encuesta?inicio=1");
    setShowInstructions(false);
  }
  function enterLeaderSegment(next: SegmentoLider) {
    window.history.replaceState(null, "", `/encuesta?grupo=provincias&segmento=${next}`);
    setLeaderSegment(next);
  }
  function exit() {
    window.history.replaceState(null, "", "/encuesta");
    setGroup(null);
    setLeaderSegment(null);
  }

  if (showInstructions) return <InstructionsPage onStart={start} />;
  if (!group) return <GroupGate onEnter={enter} />;
  if (group === "provincias" && !leaderSegment) return <LeaderSegmentGate onEnter={enterLeaderSegment} onExit={exit} />;
  return <Survey key={`${group}-${leaderSegment ?? "general"}-${round}`} group={group} leaderSegment={leaderSegment} onExit={exit} onRestart={() => { participantId(group, leaderSegment, true); setRound((n) => n + 1); }} />;
}

function InstructionsPage({ onStart }: { onStart: () => void }) {
  const competencies = [
    { name: "Creatividad", description: "Generación de ideas, soluciones y mejora continua.", tone: "border-brand-200 bg-brand-50/70" },
    { name: "Autonomía", description: "Delegación, desarrollo y capacidad para asumir responsabilidades.", tone: "border-ok-100 bg-ok-50/70" },
    { name: "Competitividad", description: "Orientación a resultados, excelencia y cumplimiento.", tone: "border-warn-100 bg-warn-50/70" },
    { name: "Empatía", description: "Escucha, comunicación respetuosa y comprensión de las personas.", tone: "border-danger-100 bg-danger-50/60" },
    { name: "Integración", description: "Colaboración, coordinación y construcción de equipos.", tone: "border-brand-200 bg-brand-25" },
  ];

  return (
    <div className="fade-rise mx-auto max-w-5xl py-5 md:py-9">
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-6 py-9 shadow-[0_24px_70px_rgba(13,47,100,0.24)] sm:px-10 md:py-12">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-white/10" />
        <div className="absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-danger-500/20 blur-2xl" />
        <div className="relative max-w-4xl">
          <p className="inline-flex rounded-full bg-danger-500 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white">Evaluación 2026</p>
          <h1 className="mt-5 text-[clamp(38px,6vw,68px)] font-extrabold leading-[1] tracking-[-0.03em] text-white">Evaluación de Liderazgo Comercial</h1>
          <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-brand-100">Esta evaluación busca conocer cómo se manifiestan determinadas conductas de liderazgo en la gestión comercial. Los resultados permitirán reconocer fortalezas e identificar oportunidades de desarrollo.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[20px] border border-brand-100 bg-surface p-6 shadow-[0_12px_35px_rgba(13,47,100,0.08)]">
          <div className="mb-5 h-1.5 w-14 rounded-full bg-danger-500" />
          <h2 className="text-xl font-semibold text-brand-900">Antes de comenzar</h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-500">
            <li><span className="mr-2 font-semibold text-brand-600">1.</span>Selecciona el grupo o segmento al que perteneces.</li>
            <li><span className="mr-2 font-semibold text-brand-600">2.</span>Responde considerando únicamente conductas que hayas observado.</li>
            <li><span className="mr-2 font-semibold text-brand-600">3.</span>Utiliza la escala del 1 al 5. Si no cuentas con información suficiente, selecciona la opción 6.</li>
            <li><span className="mr-2 font-semibold text-brand-600">4.</span>Completa las 20 afirmaciones antes de enviar la evaluación.</li>
          </ol>
          <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-brand-100 bg-brand-50 p-4 text-[13px] leading-relaxed text-brand-800"><ShieldCheck size={22} weight="fill" className="mt-px shrink-0 text-brand-600" />La encuesta no solicita nombre ni DNI. Las respuestas se registran de forma anónima y se presentan de manera consolidada.</div>
        </section>

        <section className="rounded-[20px] border border-brand-100 bg-surface p-6 shadow-[0_12px_35px_rgba(13,47,100,0.08)]">
          <div className="mb-5 h-1.5 w-14 rounded-full bg-brand-600" />
          <h2 className="text-xl font-semibold text-brand-900">Competencias evaluadas</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">Se medirán cinco competencias mediante comportamientos observables:</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {competencies.map((competency, index) => (
              <div key={competency.name} className={`rounded-[14px] border p-4 ${competency.tone}`}>
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[12px] font-bold text-brand-700 shadow-sm">{index + 1}</div>
                <p className="text-sm font-semibold text-ink-900">{competency.name}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{competency.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end rounded-[16px] bg-brand-50 px-5 py-4">
        <Button variant="primary" onClick={onStart}>Comenzar evaluación <ArrowRight size={17} weight="bold" /></Button>
      </div>
    </div>
  );
}

function GroupGate({ onEnter }: { onEnter: (group: GrupoEncuesta) => void }) {
  return (
    <div className="fade-rise mx-auto max-w-5xl pt-6 md:pt-12">
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-brand-900 to-brand-600 p-7 shadow-[0_18px_50px_rgba(13,47,100,0.20)] sm:p-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[34px] border-white/10" />
        <div className="relative max-w-3xl">
          <p className="inline-flex rounded-full bg-danger-500 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.18em] text-white">Acceso por grupo</p>
          <h1 className="mt-4 text-[clamp(36px,5vw,58px)] font-extrabold leading-[1] tracking-[-0.03em] text-white">Evaluación de Liderazgo Comercial</h1>
          <p className="mt-5 text-[16px] leading-relaxed text-brand-100">Selecciona el grupo al que perteneces. No necesitas código personal y tus respuestas se guardarán de forma anónima.</p>
          <div className="mt-4 flex items-start gap-2.5 text-[13px] text-white/85"><ShieldCheck size={18} weight="fill" className="mt-px shrink-0 text-white" />La plataforma no solicita tu nombre ni tu DNI.</div>
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {GRUPOS_ENCUESTA.map((group, index) => (
          <button key={group.id} onClick={() => onEnter(group.id)} className="group relative overflow-hidden flex items-center gap-4 rounded-[16px] border border-brand-100 bg-surface p-5 text-left shadow-[0_8px_24px_rgba(13,47,100,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-[0_14px_34px_rgba(13,47,100,0.14)]">
            <span className={`absolute inset-y-0 left-0 w-1.5 ${index % 2 === 0 ? "bg-brand-600" : "bg-danger-500"}`} />
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600"><UsersThree size={25} weight="bold" /></span>
            <span><span className="block text-[17px] font-semibold text-ink-900">{group.label}</span><span className="mt-0.5 block text-[13px] text-ink-500">Ingresar a la encuesta</span></span>
            <ArrowRight size={18} weight="bold" className="ml-auto text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

function LeaderSegmentGate({ onEnter, onExit }: { onEnter: (segment: SegmentoLider) => void; onExit: () => void }) {
  return (
    <div className="fade-rise mx-auto max-w-5xl pt-6 md:pt-12">
      <div className="rounded-[22px] border border-brand-100 bg-gradient-to-r from-brand-50 to-surface p-7 shadow-[0_14px_40px_rgba(13,47,100,0.10)] sm:p-9">
        <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-danger-600">Líderes de equipo</p>
        <h1 className="mt-4 text-[clamp(34px,5vw,56px)] font-extrabold leading-[1] tracking-[-0.03em] text-brand-900">Selecciona tu segmento</h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink-500">Esta selección define a quiénes evaluarás. Tus respuestas continuarán guardándose de forma anónima.</p>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SEGMENTOS_LIDERES.map((segment, index) => (
          <button key={segment.id} onClick={() => onEnter(segment.id)} className="group relative overflow-hidden flex items-center gap-4 rounded-[16px] border border-brand-100 bg-surface p-5 text-left shadow-[0_8px_24px_rgba(13,47,100,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-[0_14px_34px_rgba(13,47,100,0.14)]">
            <span className={`absolute inset-y-0 left-0 w-1.5 ${index % 2 === 0 ? "bg-brand-600" : "bg-danger-500"}`} />
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600"><UsersThree size={25} weight="bold" /></span>
            <span><span className="block text-[17px] font-semibold text-ink-900">{segment.label}</span><span className="mt-0.5 block text-[13px] text-ink-500">{segment.descripcion}</span></span>
            <ArrowRight size={18} weight="bold" className="ml-auto shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </button>
        ))}
      </div>
      <button onClick={onExit} className="mt-6 text-sm font-medium text-brand-600">Cambiar de grupo</button>
    </div>
  );
}

function Survey({ group, leaderSegment, onExit, onRestart }: { group: GrupoEncuesta; leaderSegment: SegmentoLider | null; onExit: () => void; onRestart: () => void }) {
  const evaluated = useMemo(
    () => group === "provincias" && leaderSegment ? evaluadosDeSegmentoLider(personas, leaderSegment) : evaluadosDeGrupo(personas, group),
    [group, leaderSegment]
  );
  const questions: Pregunta[] = useMemo(() => preguntasActivas(), []);
  const [submissionId] = useState(() => participantId(group, leaderSegment));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [status, setStatus] = useState<"cargando" | "pendiente" | "hecho" | "enviando">("cargando");
  const { toasts, push, dismiss } = useToasts();
  const groupLabel = leaderSegment
    ? SEGMENTOS_LIDERES.find((item) => item.id === leaderSegment)?.label ?? leaderSegment
    : GRUPOS_ENCUESTA.find((item) => item.id === group)?.label ?? group;

  useEffect(() => {
    let active = true;
    yaCompleto(submissionId).then((done) => { if (active) setStatus(done ? "hecho" : "pendiente"); });
    return () => { active = false; };
  }, [submissionId]);

  if (!evaluated.length) return <Centered title="Este grupo no tiene líderes asignados" onExit={onExit}>Verifica la configuración con la administración de la evaluación.</Centered>;
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
      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-brand-100 bg-brand-50 px-4 py-3">
        <div><span className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">Evaluación de Liderazgo Comercial {EDICION} · {groupLabel}</span><p className="text-[13px] text-ink-500">Evaluando a {evaluated.length} líderes</p></div>
        <button onClick={onExit} className="text-sm font-medium text-brand-700 hover:text-brand-900">Cambiar grupo</button>
      </div>
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-brand-900 to-brand-700 p-6 shadow-[0_14px_38px_rgba(13,47,100,0.18)]">
        <span className="absolute right-0 top-0 h-full w-2 bg-danger-500" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-200">{competency} · Pregunta {questionIndex + 1} de {questions.length}</p>
        <h1 className="mt-2 pr-3 text-[22px] font-semibold leading-snug text-white">{question.texto}</h1>
        <p className="mt-1.5 text-sm text-brand-100">Aplica el mismo criterio a cada líder según lo que hayas observado.</p>
      </div>
      <div className="flex flex-col gap-3">
        {evaluated.map((person) => {
          const value = answers[question.id]?.[person.id];
          return (
            <div key={person.id} className={`rounded-[16px] border bg-surface p-4 shadow-[0_6px_20px_rgba(13,47,100,0.05)] transition-colors ${value !== undefined ? "border-ok-100" : "border-brand-100"}`}>
              <div className="mb-3 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand-700 to-brand-900 text-[13px] font-bold text-white shadow-sm">{person.nombre.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</div><div><p className="text-sm font-semibold text-ink-900">{person.nombre}</p><p className="text-[12px] text-ink-500">{person.cargo}</p></div><span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${value !== undefined ? "bg-ok-50 text-ok-600" : "bg-brand-50 text-brand-600"}`}>{value !== undefined ? "Respondida" : "Pendiente"}</span></div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                {ESCALA.map((option) => <button key={option.value} onClick={() => setCell(person.id, option.value)} className={`rounded-[10px] border px-2 py-2.5 text-[12px] leading-tight transition-colors ${value === option.value ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"}`}><span className="tnum mr-1 font-mono font-semibold">{option.value}</span>{option.label}</button>)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-4 flex items-center gap-3 rounded-[14px] border border-brand-200 bg-surface/95 p-4 shadow-[0_10px_30px_rgba(13,47,100,0.14)] backdrop-blur"><span className="rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-medium text-brand-700">{completed} de {questions.length} preguntas completas</span><div className="ml-auto flex items-center gap-2"><Button variant="secondary" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={questionIndex === 0}>Anterior</Button>{questionIndex < questions.length - 1 ? <Button variant="primary" onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={!questionComplete(question.id)}>Siguiente</Button> : <Button variant="primary" onClick={finish} disabled={!allReady || status === "enviando"}>{status === "enviando" ? "Enviando…" : "Finalizar y enviar"}</Button>}</div></div>
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function Centered({ title, children, icon, onExit, secondaryLabel, onSecondary }: { title: string; children: React.ReactNode; icon?: boolean; onExit: () => void; secondaryLabel?: string; onSecondary?: () => void }) {
  return <div className="mx-auto mt-16 max-w-md rounded-[14px] border border-line bg-surface p-8 text-center">{icon && <CheckCircle size={44} weight="fill" className="mx-auto mb-3 text-ok-600" />}<h1 className="text-xl font-semibold text-ink-900">{title}</h1><p className="mt-2 text-sm text-ink-500">{children}</p>{secondaryLabel && onSecondary && <Button variant="primary" onClick={onSecondary} className="mt-5 w-full">{secondaryLabel}</Button>}<button onClick={onExit} className="mt-4 text-sm font-medium text-brand-600">Cambiar de grupo</button></div>;
}
