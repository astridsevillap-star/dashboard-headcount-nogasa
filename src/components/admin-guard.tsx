"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    async function verifyAccess() {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email?.toLowerCase();
      if (!email) { router.replace("/login"); return; }
      const { data } = await supabase.from("hc_admins").select("email").eq("email", email).eq("active", true).maybeSingle();
      if (!active) return;
      if (data) setAllowed(true);
      else { await supabase.auth.signOut(); router.replace("/login"); }
    }
    verifyAccess();
    return () => { active = false; };
  }, [router]);

  if (!allowed) return <Skeleton className="h-[420px] w-full" />;
  return <>{children}</>;
}
