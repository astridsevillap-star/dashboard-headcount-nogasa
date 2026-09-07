"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button, TextInput } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    const result = registering
      ? await supabase.auth.signUp({ email: normalizedEmail, password })
      : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setBusy(false);
    if (result.error) {
      setError(registering ? result.error.message : "Correo o contraseña incorrectos.");
      return;
    }
    if (registering && !result.data.session) {
      setNotice("Revise su correo y confirme la cuenta. Luego podrá iniciar sesión.");
      setRegistering(false);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="mx-auto mt-12 max-w-md rounded-[12px] border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold text-ink-900">Acceso administrativo</h1>
      <p className="mt-2 text-sm text-ink-500">{registering ? "Cree su contraseña si su correo ya fue autorizado." : "Ingrese con su correo autorizado y contraseña."}</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" type="email" autoComplete="email" required />
        <TextInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={8} required />
        <Button variant="primary" type="submit" disabled={busy || !email.trim() || password.length < 8}>{busy ? "Validando…" : registering ? "Crear cuenta" : "Ingresar"}</Button>
      </form>
      <button className="mt-4 text-sm font-medium text-brand-600" onClick={() => { setRegistering((v) => !v); setError(""); setNotice(""); }}>
        {registering ? "Ya tengo una contraseña" : "Crear mi contraseña por primera vez"}
      </button>
      {notice && <p className="mt-3 text-sm text-brand-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
