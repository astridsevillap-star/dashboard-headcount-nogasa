"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui";
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
    <div className="mx-auto mt-12 max-w-md rounded-[12px] border border-line bg-surface p-6">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-brand-600">
        Evaluación cultural {EDICION}
      </span>
      <h1 className="mt-1 text-xl font-semibold text-ink-900">Acceso administrativo</h1>
      <p className="mt-2 text-sm text-ink-500">
        Ingresa la clave de administrador para ver los resultados consolidados.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <TextInput
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Clave de administrador"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button variant="primary" type="submit" disabled={busy || !key.trim()}>
          {busy ? "Validando…" : "Ingresar"}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
      <p className="mt-5 text-[12px] leading-relaxed text-ink-400">
        ¿Vas a responder la encuesta? Usa tu código personal en{" "}
        <a href="/encuesta" className="font-medium text-brand-600">Responder encuesta</a>.
      </p>
    </div>
  );
}
