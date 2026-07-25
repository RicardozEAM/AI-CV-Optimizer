import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JSON_RESPONSE_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

async function checkRateLimit(ip: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const today = new Date().toISOString().split("T")[0];

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rate_limits?ip=eq.${encodeURIComponent(ip)}&window_date=eq.${today}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rows = await res.json();
  const current = rows?.[0];

  if (!current) {
    await fetch(`${supabaseUrl}/rest/v1/rate_limits`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ip, count: 1, window_date: today }),
    });
    return true;
  }

  if (current.count >= 50) return false;

  await fetch(
    `${supabaseUrl}/rest/v1/rate_limits?ip=eq.${encodeURIComponent(ip)}&window_date=eq.${today}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ count: current.count + 1 }),
    }
  );

  return true;
}

const SYSTEM_PROMPT = `SYSTEM PROMPT — TECHSCREEN AI · TA PORTAL V3.0 (uso interno para reclutadores IT)

CONTEXTO DE USO:
- Herramienta interna usada por reclutadores IT (Talent Acquisition) para analizar perfiles técnicos, identificar brechas y estandarizar CVs para presentar a gerencia y clientes.
- El "usuario" es el reclutador, no el candidato. Nunca te dirijas al candidato.

CONTEXTO TEMPORAL:
- Hoy es Marzo de 2026.
- Si un empleo indica "Actualidad" o "Presente", mantén ese término. No pongas "Marzo 2026" como fecha de fin.
- Usa verbos en TIEMPO PRESENTE para el cargo actual y PASADO para los anteriores.

REGLAS DE ANÁLISIS:
- Prohibido inventar o alucinar datos. Si falta información crítica, refléjalo como brecha en structure_alerts.
- Extrae texto de tablas y cuadros de texto (especialmente habilidades técnicas y herramientas).
- Identifica y preserva links de LinkedIn, portafolios o GitHub.
- Ignora el nombre de la empresa reclutadora como una keyword faltante.

REGLAS DE LENGUAJE (ESTRICTAS):
- Nunca uses la palabra "testing" ni "tester". Usa "evaluación técnica" o "validación de código".
- No uses emojis en ningún string de salida (ni en analysis, questions, ni optimized_cv).
- Tono profesional, corporativo, orientado a decisiones de contratación.

REGLAS DE GENERACIÓN DEL CV (FORMATO HARVARD):
1. ESTRUCTURA: Una sola columna limpia. Si el candidato tiene >10 años de experiencia, genera 2 páginas.
2. ENCABEZADO: Nombre, Ciudad/País, Teléfono, Email y LinkedIn URL (obligatorio si existe).
3. RESUMEN EJECUTIVO: Potente, orientado a logros y años de experiencia reales del candidato.
4. SKILL GRID: Cuadrícula de 12 keywords clave (4 filas x 3 columnas) justo después del resumen. Devuelve exactamente 12 strings en "skill_grid".
5. EXPERIENCIA: No resumas logros con métricas (%), cifras monetarias o certificaciones. Úsalos para demostrar impacto.
6. El CV estandarizado debe estar listo para presentar a gerencia y clientes.

INPUTS:
1. CV_TEXT: texto completo del CV del candidato.
2. JD_TEXT: descripción completa de la vacante.
3. CANDIDATE_ANSWERS (opcional): contexto extra o instrucción automática del reclutador.

REGLA CRÍTICA — SIEMPRE GENERAR OPTIMIZED_CV:
El campo "optimized_cv" NUNCA puede ser null. SIEMPRE genera el CV Harvard estandarizado a partir del CV del candidato, usando únicamente información presente en el CV (y en CANDIDATE_ANSWERS si existen). No inventes datos.

REGLA CRÍTICA — SIEMPRE GENERAR VALIDATION_QUESTIONS (GUÍA DE PHONE SCREEN):
El array "validation_questions" contiene la Guía de Phone Screen: 3 preguntas que el reclutador usará durante la entrevista telefónica con el candidato. NUNCA puede estar vacío.
- Cada pregunta debe referenciar contexto real del CV (empresa, rol o tecnología específica) o de la vacante.
- Cada pregunta debe ayudar al reclutador a validar profundidad técnica, seniority o impacto de negocio.
- Las 3 preguntas deben cubrir categorías distintas: profundidad técnica / scope de liderazgo o autonomía / impacto de negocio.
- El campo "context" describe el objetivo de la pregunta para el reclutador (qué está validando).
- No incluyas emojis. No uses la palabra "testing" (usa "evaluación técnica" o "validación de código").

ESTRUCTURA JSON DE SALIDA OBLIGATORIA:
Tu salida SIEMPRE es JSON válido. Nunca escribas texto fuera del JSON. Nunca uses markdown.

{
  "analysis": {
    "match_score": <integer 0-100>,
    "scoring_details": {
      "keywords": <integer 0-30>,
      "experience": <integer 0-40>,
      "structure": <integer 0-30>
    },
    "keywords_detected": [
      { "term": <string>, "weight": <"critical"|"high"|"medium">, "found_in": <string>, "has_evidence": <boolean> }
    ],
    "keywords_missing": [
      { "term": <string>, "weight": <"critical"|"high"|"medium">, "vacancy_frequency": <integer> }
    ],
    "structure_alerts": [
      { "type": <"warning"|"error"|"info">, "message": <string>, "fix": <string> }
    ]
  },
  "validation_questions": [
    { "id": <1|2|3>, "question": <string>, "context": <string> }
  ],
  "optimized_cv": {
    "header": { "full_name": "", "location": "", "email": "", "phone": "", "linkedin_url": "" },
    "summary": "",
    "skill_grid": ["skill1", "skill2", "... exactamente 12 items"],
    "work_experience": [{ "company": "", "role": "", "period": "", "is_current": <boolean>, "achievements": [] }],
    "education": [],
    "certifications": []
  }
}

AJUSTE DE PENALIZACIÓN POR CARACTERES ESPECIALES: pipes (|) u otros separadores no estándar penalizan como MÁXIMO -5 puntos en el score de estructura.

REGLA ABSOLUTA — NO INVENCIÓN: Nunca inferirás, supondrás ni inventarás información del candidato. Si un dato no está en el CV, márcalo como ausente en structure_alerts.`;

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info: (stage: string, msg: string, meta?: unknown) =>
    console.log(JSON.stringify({ level: "INFO", stage, msg, ...(meta ? { meta } : {}), ts: new Date().toISOString() })),
  warn: (stage: string, msg: string, meta?: unknown) =>
    console.warn(JSON.stringify({ level: "WARN", stage, msg, ...(meta ? { meta } : {}), ts: new Date().toISOString() })),
  error: (stage: string, msg: string, meta?: unknown) =>
    console.error(JSON.stringify({ level: "ERROR", stage, msg, ...(meta ? { meta } : {}), ts: new Date().toISOString() })),
};

// ─── JSON Sanitizer ───────────────────────────────────────────────────────────

function sanitizeAndParseJSON(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    log.warn("json_sanitizer", "Direct parse failed, trying fence strip");
  }

  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(fenceStripped);
  } catch {
    log.warn("json_sanitizer", "Fence-stripped parse failed, trying regex extraction");
  }

  const match = fenceStripped.match(/(\{[\s\S]*\})/);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      log.warn("json_sanitizer", "Regex extraction parse failed, attempting light repair");
    }

    const repaired = match[1]
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"');

    try {
      return JSON.parse(repaired);
    } catch (err) {
      log.error("json_sanitizer", "All repair strategies exhausted", {
        repaired_preview: repaired.slice(0, 300),
        error: String(err),
      });
    }
  }

  throw new SyntaxError(`JSON extraction failed. Raw preview: ${trimmed.slice(0, 200)}`);
}

// ─── Validators ───────────────────────────────────────────────────────────────

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateRequestBody(body: unknown): { cv_text: string; jd_text: string; candidate_answers?: unknown } {
  if (!body || typeof body !== "object") {
    throw new TypeError("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.cv_text)) {
    throw new TypeError("cv_text is required and must be a non-empty string");
  }
  if (!isNonEmptyString(b.jd_text)) {
    throw new TypeError("jd_text is required and must be a non-empty string");
  }

  return {
    cv_text: b.cv_text,
    jd_text: b.jd_text,
    candidate_answers: b.candidate_answers,
  };
}

function normalizeAIResult(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("AI result is not an object");
  }

  const r = raw as Record<string, unknown>;

  if (!r.analysis || typeof r.analysis !== "object") {
    log.warn("normalizer", "Missing 'analysis' block — injecting default");
    r.analysis = {};
  }
  const analysis = r.analysis as Record<string, unknown>;
  if (typeof analysis.match_score !== "number") analysis.match_score = 0;
  if (!Array.isArray(analysis.keywords_detected)) analysis.keywords_detected = [];
  if (!Array.isArray(analysis.keywords_missing)) analysis.keywords_missing = [];
  if (!Array.isArray(analysis.structure_alerts)) analysis.structure_alerts = [];
  if (!analysis.scoring_details || typeof analysis.scoring_details !== "object") {
    analysis.scoring_details = { keywords: 0, experience: 0, structure: 0 };
  }

  if (!Array.isArray(r.validation_questions) || (r.validation_questions as unknown[]).length === 0) {
    log.warn("normalizer", "Empty or missing validation_questions — injecting fallback");
    r.validation_questions = [
      { id: 1, question: "¿Puede describir en detalle una arquitectura técnica que haya diseñado recientemente y las decisiones clave que tomó?", context: "Validar profundidad técnica y criterio de diseño." },
      { id: 2, question: "¿Qué scope de autonomía y liderazgo ha tenido en sus últimos proyectos (tamaño de equipo, decisiones a cargo)?", context: "Validar seniority y capacidad de liderazgo." },
      { id: 3, question: "¿Cuál ha sido el impacto de negocio medible más relevante de su trabajo en el último año?", context: "Validar orientación a resultados e impacto de negocio." },
    ];
  }

  if (r.optimized_cv === undefined) r.optimized_cv = null;
  // Note: optimized_cv should always be generated by the model (V3.0 prompt). The
  // frontend will trigger a retry if it comes back null.

  return r;
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_RESPONSE_HEADERS });
}

function errorResponse(message: string, status: number): Response {
  log.error("http", `Responding ${status}`, { message });
  return jsonResponse({ error: message }, status);
}

// ─── AI Gateway ───────────────────────────────────────────────────────────────

async function callAIGateway(userPrompt: string, apiKey: string): Promise<string> {
  log.info("ai_gateway", "Sending request", { prompt_length: userPrompt.length });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      temperature: 0.3,
      max_tokens: 16000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  log.info("ai_gateway", "Response received", { status: response.status });

  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable body)");
    log.error("ai_gateway", "Non-2xx response", { status: response.status, body_preview: errText.slice(0, 400) });

    if (response.status === 429) throw Object.assign(new Error("rate_limited"), { httpStatus: 429 });
    if (response.status === 402) throw Object.assign(new Error("payment_required"), { httpStatus: 402 });

    throw Object.assign(
      new Error(`AI gateway returned ${response.status}: ${errText.slice(0, 200)}`),
      { httpStatus: 502 },
    );
  }

  const data = await response.json();
  const rawContent: unknown = data?.choices?.[0]?.message?.content;

  log.info("ai_gateway", "Content extracted", {
    content_type: typeof rawContent,
    content_length: typeof rawContent === "string" ? rawContent.length : null,
    content_preview: typeof rawContent === "string" ? rawContent.slice(0, 200) : rawContent,
  });

  if (!isNonEmptyString(rawContent)) {
    log.error("ai_gateway", "Empty or missing content in response", { choices: data?.choices });
    throw new Error("AI response contained no usable content");
  }

  return rawContent;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return errorResponse("Has alcanzado el límite de 5 análisis por día. Intenta mañana.", 429);
    }
  } catch (err) {
    log.warn("rate_limit", "Rate limit check failed, allowing request", { error: String(err) });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  log.info("handler", `Request received [${requestId}]`, { method: req.method });

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (err) {
      log.warn("handler", "Failed to parse request body as JSON", { error: String(err) });
      return errorResponse("Request body must be valid JSON", 400);
    }

    let cv_text: string, jd_text: string, candidate_answers: unknown;
    try {
      ({ cv_text, jd_text, candidate_answers } = validateRequestBody(body));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : "Invalid request body", 400);
    }

    log.info("handler", "Input validated", {
      cv_length: cv_text.length,
      jd_length: jd_text.length,
      has_answers: !!candidate_answers,
    });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      log.error("handler", "LOVABLE_API_KEY env var is not set");
      return errorResponse("Server configuration error: missing API key", 500);
    }

    let userPrompt = `CV_TEXT:\n${cv_text}\n\nJD_TEXT:\n${jd_text}`;
    if (candidate_answers) {
      userPrompt += `\n\nCANDIDATE_ANSWERS:\n${JSON.stringify(candidate_answers)}`;
    }

    let rawContent: string;
    try {
      rawContent = await callAIGateway(userPrompt, apiKey);
    } catch (err) {
      const e = err as Error & { httpStatus?: number };
      if (e.message === "rate_limited") {
        return errorResponse("Demasiadas solicitudes. Intenta en unos segundos.", 429);
      }
      if (e.message === "payment_required") {
        return errorResponse("Créditos agotados. Agrega fondos en Settings > Workspace > Usage.", 402);
      }
      return errorResponse(`Error al contactar el servicio de IA: ${e.message}`, e.httpStatus ?? 502);
    }

    log.info("handler", "Sanitizing AI response JSON", { raw_length: rawContent.length });

    let parsedResult: unknown;
    try {
      parsedResult = sanitizeAndParseJSON(rawContent);
    } catch (err) {
      log.error("handler", "JSON sanitization failed", {
        error: String(err),
        raw_preview: rawContent.slice(0, 500),
      });
      return errorResponse(
        "La IA devolvió una respuesta en formato inválido. Intenta de nuevo.",
        500,
      );
    }

    let normalizedResult: Record<string, unknown>;
    try {
      normalizedResult = normalizeAIResult(parsedResult);
    } catch (err) {
      log.error("handler", "Normalization failed", { error: String(err) });
      return errorResponse("Error al procesar la respuesta del análisis.", 500);
    }

    log.info("handler", `Request [${requestId}] completed successfully`, {
      match_score: (normalizedResult.analysis as Record<string, unknown>)?.match_score,
      has_cv: normalizedResult.optimized_cv !== null,
    });

    return jsonResponse(normalizedResult);
  } catch (err) {
    log.error("handler", "Unhandled exception", { error: String(err) });
    return errorResponse("Error interno inesperado. Por favor intenta de nuevo.", 500);
  }
});
