import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "./errors.ts";
import { corsHeaders, json } from "./http.ts";
import { resolveOp } from "./registry.ts";
import { normalizeEmail } from "./rules/shared.ts";

/** Request body minus the envelope fields `op` and `email`. */
function payloadFromBody(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...body };
  delete payload.op;
  delete payload.email;
  return payload;
}

// ---------------------------------------------------------------------------
// AUTH HOOK POINT
// Resolves the caller's email for this request. Today it trusts `body.email`
// (normalized). A later unit replaces this with JWT verification of the
// request's Authorization header and derives the email from the token.
// ---------------------------------------------------------------------------
function resolveCallerEmail(body: Record<string, unknown>): string {
  return normalizeEmail(typeof body.email === "string" ? body.email : "");
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
    const body = await req.json();
    const op = typeof body.op === "string" ? body.op : "";
    const email = resolveCallerEmail(body);
    const payload = payloadFromBody(body);
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const handler = resolveOp(op);
    const data = await handler({ db, email }, payload);
    return json({ ok: true, data });
  } catch (err) {
    if (err instanceof LibraryOpError) {
      return json({ ok: false, code: err.code, message: err.message }, 400);
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Library request failed.";
    return json({ ok: false, code: "internal", message }, 500);
  }
});
