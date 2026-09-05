"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockSimple, ArrowRight, ChartBar } from "@phosphor-icons/react";
import { checkAdminKey, saveAdminKey } from "@/lib/backend";
import { EDICION } from "@/lib/seed";

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const ok = await checkAdminKey(key.trim());
    setBusy(false);
    if (!ok) {
      setError("Clave incorrecta.");
      return;
    }
    saveAdminKey(key.trim());
    router.replace("/");
  }

  return (
    <div className="fade-rise mx-auto grid max-w-6xl items-center gap-10 px-1 pt-6 md:min-h-[calc(100dvh-160px)] md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:pt-10">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-brand-600">Panel administrativo</p>
        <h1 className="mt-5 text-[clamp(40px,6.5vw,68px)] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink-900" style={{ textWrap: "balance" }}>
          Resultados de la evaluación cultural.
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-500">
          Consulta los resultados consolidados de la Evaluación cultural {EDICION}: índice por
          competencia, ranking y detalle por líder. Acceso reservado a Gestión de Personas.
        </p>
        <div className="mt-8 flex items-start gap-2.5 text-[13px] text-ink-500">
          <ChartBar size={18} weight="fill" className="mt-px shrink-0 text-brand-600" />
          Las respuestas se muestran siempre agregadas y anónimas.
        </div>
      </div>

      <div className="rounded-[22px] border border-line bg-surface p-7 shadow-[0_24px_70px_rgba(13,47,100,0.12)] sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600">
          <LockSimple size={24} weight="bold" />
        </span>
        <h2 className="mt-5 text-[24px] font-bold tracking-tight text-ink-900">Acceso administrativo</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
          Ingresa la clave de administrador para ver los resultados.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">Clave de administrador</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-[10px] border border-line bg-surface px-4 text-[15px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-600"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !key.trim()}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink-900 text-[15px] font-semibold text-white transition-all hover:bg-ink-700 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-40"
          >
            {busy ? "Validando…" : "Ingresar"}
            {!busy && <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
        <p className="mt-5 border-t border-line-soft pt-4 text-[13px] text-ink-500">
          ¿Vas a responder la encuesta? Usa tu código en{" "}
          <a href="/encuesta" className="font-semibold text-brand-600">Responder encuesta</a>.
        </p>
      </div>
    </div>
  );
}
