"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { let active = true; (async () => {
    const { data: u } = await supabase.auth.getUser();
    const email = u.user?.email?.toLowerCase();
    if (!email) return;
    const { data } = await supabase.from("hc_admins").select("email").eq("email", email).eq("active", true).maybeSingle();
    if (active) setIsAdmin(Boolean(data));
  })(); return () => { active = false; }; }, []);
  return isAdmin;
}
