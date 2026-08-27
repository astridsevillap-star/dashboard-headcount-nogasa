"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { Skeleton } from "@/components/ui";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAdmin()) setAllowed(true);
    else {
      setAllowed(false);
      router.replace("/login");
    }
  }, [router]);

  if (!allowed) return <Skeleton className="h-[420px] w-full" />;
  return <>{children}</>;
}
