"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { embeddedSessionReady, supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyAccess() {
      await embeddedSessionReady;
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setAllowed(true);
    }

    verifyAccess();
    return () => {
      active = false;
    };
  }, [router]);

  if (!allowed) return <Skeleton className="h-[420px] w-full" />;
  return <>{children}</>;
}
