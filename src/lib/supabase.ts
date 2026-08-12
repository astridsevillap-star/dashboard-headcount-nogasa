import { createClient } from "@supabase/supabase-js";

// Claves publicables: seguras de exponer en el cliente. El fallback garantiza
// que un deploy sin variables de entorno siga funcionando.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://shgnuihnxoahsvrnntfq.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_TGNnuqnajrAZ6m2_XyklzA_LqZoVKrS";

export const supabase = createClient(url, key);
