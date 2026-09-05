"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminKey, getAdminKey } from "@/lib/backend";
import { Wordmark } from "@/components/logo";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setAdmin(Boolean(getAdminKey()));
  }, [pathname]);

  const enEncuesta = pathname.startsWith("/encuesta");

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-6 px-5 sm:px-8">
          <Link href="/" aria-label="Inicio">
            <Wordmark />
          </Link>

          {admin && !enEncuesta && (
            <nav className="ml-4 flex h-full items-center gap-1">
              {[
                { href: "/", label: "Dashboard" },
                { href: "/organizacion", label: "Organización" },
              ].map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex h-full items-center px-3 text-sm transition-colors ${
                      active ? "font-medium text-ink-900" : "text-ink-500 hover:text-ink-900"
                    }`}
                  >
                    {item.label}
                    {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-brand-600" />}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* En la encuesta el encabezado es mínimo (solo el logo). */}
          {!enEncuesta && (
            <div className="ml-auto flex items-center gap-4">
              <Link href="/encuesta" className="text-sm font-medium text-ink-500 hover:text-ink-900">
                Responder encuesta
              </Link>
              {admin ? (
                <button
                  onClick={() => {
                    clearAdminKey();
                    setAdmin(false);
                    router.replace("/login");
                  }}
                  className="text-sm font-medium text-brand-600"
                >
                  Salir
                </button>
              ) : (
                <Link href="/login" className="text-sm font-medium text-brand-600">
                  Administrar
                </Link>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-6 sm:px-8">{children}</main>
    </div>
  );
}
