import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { purgeHandler } from "./handler.ts";

const client = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
// No public JWT is sufficient: the database validates a single-use capability
// for an eligible deleted project before this worker can touch any files.
Deno.serve(
  purgeHandler({
    claim: async (sid, token) =>
      await client.rpc("claim_site_purge", { sid, token }),
    paths: async (sid, token) =>
      await client.rpc("site_purge_paths", { sid, token }),
    remove: async (paths) =>
      await client.storage.from("site-media").remove(paths),
    finish: async (sid, token) =>
      await client.rpc("finish_site_purge", { sid, token }),
    fail: async (sid, token) =>
      await client.rpc("fail_site_purge", { sid, token }),
  }),
);
