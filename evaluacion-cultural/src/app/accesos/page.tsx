"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Skeleton, TextInput, useToasts, ToastStack } from "@/components/ui";
import { authorize, currentEmail, isOwner, revoke } from "@/lib/auth";
import { loadStore } from "@/lib/data";
import type { Admin } from "@/lib/types";

export default function AccesosPage() {
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [owner, setOwner] = useState(false);
  const [email, setEmail] = useState("");
  const { toasts, push, dismiss } = useToasts();

  function reload() {
    setRows(loadStore().admins.map((a) => ({ ...a })));
  }

  useEffect(() => {
    setOwner(isOwner(currentEmail()));
    reload();
  }, []);

  function add(event: FormEvent) {
    event.preventDefault();
    const e = email.trim().toLowerCase();
    if (!e) return;
    authorize(e);
    setEmail("");
    reload();
    push("ok", "Correo autorizado. La persona ya puede ingresar.");
  }

  function remove(target: string) {
    revoke(target);
    reload();
    push("ok", "Acceso retirado.");
  }

  if (rows === null) return <Skeleton className="h-[320px] w-full" />;

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-ink-900">Usuarios autorizados</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Cada responsable ingresa con su propio correo autorizado.
        </p>
      </div>

      {owner && (
        <form onSubmit={add} className="flex gap-2 rounded-[12px] border border-line bg-surface p-5">
          <TextInput
            className="flex-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
            required
          />
          <Button variant="primary" type="submit">
            Autorizar correo
          </Button>
        </form>
      )}

      <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
        {rows.map((row) => (
          <div
            key={row.email}
            className="flex items-center gap-3 border-b border-line-soft px-5 py-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">{row.email}</p>
              <p className="text-xs text-ink-500">
                {row.role === "owner" ? "Administradora principal" : "Responsable autorizado"}
              </p>
            </div>
            <span className="ml-auto text-xs text-ink-500">{row.active ? "Activo" : "Inactivo"}</span>
            {owner && row.role !== "owner" && (
              <Button variant="ghost" size="sm" onClick={() => remove(row.email)}>
                Retirar
              </Button>
            )}
          </div>
        ))}
      </section>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
