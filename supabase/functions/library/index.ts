import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "./errors.ts";
import { corsHeaders, json } from "./http.ts";
import { resolveOp } from "./registry.ts";
import { parseBearerToken, statusForErrorCode } from "./rules/auth.ts";
import { normalizeEmail } from "./rules/shared.ts";

/** Request body minus the envelope fields `op` and `email`. `email` is dropped unread. */
function payloadFromBody(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...body };
  delete payload.op;
  delete payload.email;
  return payload;
}

type Caller = { email: string; userId: string };

/**
 * Identity comes only from the verified JWT in `Authorization: Bearer <jwt>`.
 * The gateway (`verify_jwt = true`) also accepts the public anon key, which is a JWT with no user,
 * so `auth.getUser` is the real check: it fails for the anon key and for expired/forged tokens.
 * Any failure, or a user without an email, is 401 `unauthenticated`. `body.email` is never read.
 */
async function resolveCaller(req: Request, db: SupabaseClient): Promise<Caller> {
  const jwt = parseBearerToken(req.headers.get("Authorization"));
  const { data, error } = await db.auth.getUser(jwt);
  const user = data?.user;
  if (error || !user) {
    throw new LibraryOpError("unauthenticated", "Sign in required.");
  }
  const email = normalizeEmail(user.email ?? "");
  if (!email) {
    throw new LibraryOpError("unauthenticated", "Signed-in account has no email.");
  }
  return { email, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, code: "internal", message: "Library function is not configured." }, 500);
    }
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { email, userId } = await resolveCaller(req, db);
    const body = await req.json();
    const op = typeof body.op === "string" ? body.op : "";
    const payload = payloadFromBody(body);
    const handler = resolveOp(op);
    const data = await handler({ db, email, userId }, payload);
    return json({ ok: true, data });
  } catch (err) {
    if (err instanceof LibraryOpError) {
      return json({ ok: false, code: err.code, message: err.message }, statusForErrorCode(err.code));
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Library request failed.";
    return json({ ok: false, code: "internal", message }, 500);
  }
});
