"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/seed";
import { Button, TextInput } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const err = signIn(email);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/evaluaciones");
  }

  return (
    <div className="mx-auto mt-12 max-w-md rounded-[12px] border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold text-ink-900">Acceso administrativo</h1>
      <p className="mt-2 text-sm text-ink-500">
        Ingrese con un correo autorizado para gestionar evaluaciones, metas y accesos.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <TextInput
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.com"
          type="email"
          autoComplete="email"
          required
        />
        <Button variant="primary" type="submit" disabled={!email.trim()}>
          Ingresar
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
      <p className="mt-5 rounded-[8px] bg-brand-25 px-3 py-2.5 text-[12px] leading-relaxed text-ink-500">
        Administradora principal: <span className="font-medium text-ink-700">{OWNER_EMAIL}</span>.
        Esta es una autenticación de demostración (valida el correo contra la lista de
        autorizados en el navegador). Para producción se conecta a un proveedor de
        identidad real.
      </p>
    </div>
  );
}
