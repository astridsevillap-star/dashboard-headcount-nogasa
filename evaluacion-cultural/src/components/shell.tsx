"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentEmail, isAdmin as checkAdmin, signOut } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/evaluar", label: "Evaluar", admin: true },
  { href: "/configuracion", label: "Configuración", admin: true },
  { href: "/metas", label: "Metas", admin: true },
  { href: "/accesos", label: "Accesos", admin: true },
];

const ADMIN_PREFIXES = ["/evaluar", "/metas", "/configuracion", "/accesos"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setAdmin(checkAdmin());
    setEmail(currentEmail());
  }, [pathname]);

  const inAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand-600 font-mono text-[11px] font-bold tracking-tight text-white">
              EC
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-ink-900 sm:block">
              Evaluación cultural
            </span>
          </Link>

          <nav className="flex h-full items-center gap-1">
            {NAV.filter((item) => !item.admin || admin).map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-full items-center px-3 text-sm transition-colors ${
                    active ? "font-medium text-ink-900" : "text-ink-500 hover:text-ink-900"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-brand-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link href="/encuesta" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              Responder encuesta
            </Link>
            {admin && email && (
              <span className="hidden text-[12px] text-ink-500 md:block">{email}</span>
            )}
            {admin ? (
              <button
                onClick={() => {
                  signOut();
                  setAdmin(false);
                  router.replace("/");
                }}
                className="text-sm font-medium text-brand-600"
              >
                Salir
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-brand-600"
                aria-current={inAdmin ? "page" : undefined}
              >
                Administrar
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
