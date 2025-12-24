import { createClient } from "@refinedev/supabase";

const SUPABASE_URL = "https://REDACTED_PROJECT_ID.supabase.co";
const SUPABASE_KEY =
  "REDACTED_API_KEY";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
