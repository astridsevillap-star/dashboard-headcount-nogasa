"use client";

import { loadStore, mutate } from "./data";

/* ---------------------------------------------------------------------------
   Autenticación de la versión estándar.
   Es una puerta de demostración basada en localStorage: valida que el correo
   esté en la lista de administradores autorizados. NO es seguridad real (todo
   corre en el navegador). Para producción, reemplazar por un proveedor de auth
   (p. ej. Supabase Auth) y validar los administradores en el servidor.
--------------------------------------------------------------------------- */

const SESSION_KEY = "ec_session_v1";

export function currentEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function isAuthorized(email: string): boolean {
  const s = loadStore();
  const e = email.trim().toLowerCase();
  return s.admins.some((a) => a.email.toLowerCase() === e && a.active);
}

export function isOwner(email: string | null): boolean {
  if (!email) return false;
  const s = loadStore();
  const e = email.toLowerCase();
  return s.admins.some((a) => a.email.toLowerCase() === e && a.role === "owner" && a.active);
}

/** Intenta iniciar sesión. Devuelve error legible o null si tuvo éxito. */
export function signIn(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!e) return "Ingrese un correo.";
  if (!isAuthorized(e)) return "Este correo no está autorizado. Solicite acceso a la administradora.";
  try {
    window.localStorage.setItem(SESSION_KEY, e);
  } catch {
    return "No se pudo guardar la sesión en este navegador.";
  }
  return null;
}

export function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function isAdmin(): boolean {
  const email = currentEmail();
  return email ? isAuthorized(email) : false;
}

/* ---------- gestión de accesos ---------- */

export function authorize(email: string) {
  const e = email.trim().toLowerCase();
  mutate((s) => {
    const existing = s.admins.find((a) => a.email.toLowerCase() === e);
    if (existing) {
      existing.active = true;
    } else {
      s.admins.push({ email: e, role: "editor", active: true });
    }
  });
}

export function revoke(email: string) {
  const e = email.trim().toLowerCase();
  mutate((s) => {
    s.admins = s.admins.filter(
      (a) => !(a.email.toLowerCase() === e && a.role !== "owner")
    );
  });
}
