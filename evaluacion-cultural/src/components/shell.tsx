"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminKey, getAdminKey } from "@/lib/backend";

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
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand-600 font-mono text-[11px] font-bold tracking-tight text-white">
              EC
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-ink-900 sm:block">
              Evaluación cultural
            </span>
          </Link>

          {admin && !enEncuesta && (
            <nav className="flex h-full items-center gap-1">
              <Link
                href="/"
                className={`relative flex h-full items-center px-3 text-sm transition-colors ${
                  pathname === "/" ? "font-medium text-ink-900" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                Dashboard
                {pathname === "/" && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-brand-600" />}
              </Link>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-4">
            {!enEncuesta && (
              <Link href="/encuesta" className="text-sm font-medium text-ink-500 hover:text-ink-900">
                Responder encuesta
              </Link>
            )}
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
              !enEncuesta && (
                <Link href="/login" className="text-sm font-medium text-brand-600">
                  Administrar
                </Link>
              )
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
