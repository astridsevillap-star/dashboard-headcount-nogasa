import { createClient } from "@supabase/supabase-js";

// Clave publicable: segura de exponer en el cliente. El acceso a datos se
// gobierna con RLS y funciones security-definer en Supabase.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://shgnuihnxoahsvrnntfq.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_TGNnuqnajrAZ6m2_XyklzA_LqZoVKrS";

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
