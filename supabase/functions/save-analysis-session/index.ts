import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JSON_RESPONSE_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

interface SessionPayload {
  position: string;
  candidate_name?: string;
  initial_score: number;
  updated_score?: number;
  harvard_generated?: boolean;
  anonimized?: boolean;
  answers?: Record<string, string>;
  recruiter_email?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateBody(body: unknown): SessionPayload {
  if (!body || typeof body !== "object") {
    throw new Error("El cuerpo de la solicitud debe ser un objeto JSON");
  }

  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.position)) {
    throw new Error('El campo "position" es obligatorio y debe ser texto');
  }

  if (!isValidNumber(b.initial_score)) {
    throw new Error('El campo "initial_score" es obligatorio y debe ser un número');
  }

  const payload: SessionPayload = {
    position: b.position.trim(),
    initial_score: Math.round(b.initial_score),
  };

  if (isNonEmptyString(b.candidate_name)) {
    payload.candidate_name = b.candidate_name.trim();
  }

  if (isValidNumber(b.updated_score)) {
    payload.updated_score = Math.round(b.updated_score);
  }

  if (typeof b.harvard_generated === "boolean") {
    payload.harvard_generated = b.harvard_generated;
  }

  if (typeof b.anonimized === "boolean") {
    payload.anonimized = b.anonimized;
  }

  if (isNonEmptyString(b.recruiter_email)) {
    payload.recruiter_email = b.recruiter_email.trim();
  }

  if (b.answers && typeof b.answers === "object" && !Array.isArray(b.answers)) {
    const answers = b.answers as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === "string") {
        clean[key] = value.trim();
      }
    }
    if (Object.keys(clean).length > 0) {
      payload.answers = clean;
    }
  }

  return payload;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: JSON_RESPONSE_HEADERS,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Configuración del servidor incompleta" }), {
      status: 500,
      headers: JSON_RESPONSE_HEADERS,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "El cuerpo debe ser JSON válido" }), {
      status: 400,
      headers: JSON_RESPONSE_HEADERS,
    });
  }

  let payload: SessionPayload;
  try {
    payload = validateBody(body);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Solicitud inválida" }),
      { status: 400, headers: JSON_RESPONSE_HEADERS },
    );
  }

  const record = {
    position: payload.position,
    candidate_name: payload.candidate_name ?? null,
    initial_score: payload.initial_score,
    updated_score: payload.updated_score ?? null,
    harvard_generated: payload.harvard_generated ?? false,
    anonimized: payload.anonimized ?? true,
    recruiter_email: payload.recruiter_email ?? null,
    answers: payload.answers ? JSON.stringify(payload.answers) : null,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/analysis_sessions`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(error no legible)");
    return new Response(
      JSON.stringify({ error: "No se pudo guardar la sesión de análisis", details: text }),
      { status: 502, headers: JSON_RESPONSE_HEADERS },
    );
  }

  return new Response(JSON.stringify({ saved: true }), { status: 200, headers: JSON_RESPONSE_HEADERS });
});
