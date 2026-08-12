"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/datos", label: "Datos mensuales" },
  { href: "/presupuesto", label: "Presupuesto" },
  { href: "/configuracion", label: "Configuración" },
  { href: "/accesos", label: "Accesos", admin: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/datos") || pathname.startsWith("/presupuesto") || pathname.startsWith("/configuracion") || pathname.startsWith("/accesos");

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand-600 font-mono text-[11px] font-bold tracking-tight text-white">
              HC
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-ink-900 sm:block">
              Headcount
            </span>
          </Link>

          <nav className="flex h-full items-center gap-1">
            {NAV.filter((item) => !item.admin || pathname.startsWith("/accesos")).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-full items-center px-3 text-sm transition-colors ${
                    active
                      ? "font-medium text-ink-900"
                      : "text-ink-500 hover:text-ink-900"
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
          <Link href={isAdmin ? "/" : "/login"} className="ml-auto text-sm font-medium text-brand-600">
            {isAdmin ? "Vista pública" : "Administrar"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
