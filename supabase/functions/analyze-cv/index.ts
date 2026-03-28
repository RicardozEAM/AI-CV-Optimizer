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

  if (current.count >= 5) return false;

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

const SYSTEM_PROMPT = `SYSTEM PROMPT — ATS CV OPTIMIZER & HARVARD GENERATOR V2.0

CONTEXTO TEMPORAL:
- Hoy es Marzo de 2026.
- Si un empleo indica "Actualidad" o "Presente", MANTEN ese termino. No pongas "Marzo 2026" como fecha de fin.
- Usa verbos en TIEMPO PRESENTE para el cargo actual y PASADO para los anteriores.

REGLAS DE EXTRACCION Y ANALISIS:
- Prohibido inventar o alucinar datos. Si falta informacion critica, pidela en las preguntas de validacion.
- Extrae texto de TABLAS y CUADROS DE TEXTO (especialmente habilidades tecnicas y herramientas).
- Identifica y preserva links de LinkedIn, Portafolios o GitHub.
- Ignora el nombre de la empresa reclutadora (ej. TCS) como una keyword faltante.

REGLAS DE GENERACION (FORMATO HARVARD):
1. ESTRUCTURA: Una sola columna limpia. Si el usuario tiene >10 anos de experiencia, genera 2 PAGINAS.
2. ENCABEZADO: Nombre, Ciudad/Pais, Telefono, Email y LinkedIn URL (Obligatorio si existe).
3. RESUMEN EJECUTIVO: Potente, orientado a logros y anos de experiencia reales.
4. SKILL GRID (NUEVO): Inserta una cuadricula de 12 keywords clave (4 filas x 3 columnas) justo despues del Resumen. Devuelve exactamente 12 strings en el array "skill_grid".
5. EXPERIENCIA: No resumas logros que contengan metricas (%), cifras monetarias o certificaciones (ISO, BASC, SMETA). Usalos para demostrar impacto.
6. INTEGRACION: Fusiona las respuestas de las 3 preguntas de validacion dentro de las secciones correspondientes para maximizar el Match Score.

TONO: Profesional, ejecutivo y altamente competitivo para estandares ATS modernos.

INPUTS QUE RECIBIRAS:
1. CV_TEXT: el texto completo del CV del candidato
2. JD_TEXT: la descripcion completa de la vacante
3. CANDIDATE_ANSWERS (opcional): respuestas a las 3 preguntas de validacion. Si estan presentes, genera el optimized_cv completo. Si no estan, devuelve optimized_cv como null.

REGLA CRITICA — SIEMPRE GENERAR VALIDATION_QUESTIONS:
El array "validation_questions" NUNCA puede estar vacio. SIEMPRE debes devolver EXACTAMENTE 3 preguntas.
- Si el CV tiene gaps claros: genera preguntas para llenar esos gaps con metricas y logros cuantificables.
- Si el CV ya es fuerte (match_score >= 75): genera preguntas de "Profundizacion de Logros" para extraer metricas mas impactantes, o preguntas de "Vision Estrategica" para diferenciar al candidato.
- Cada pregunta debe referenciar contexto real del CV (empresa, rol o tecnologia especifica).
- Cada pregunta debe incluir un ejemplo de respuesta ideal en parentesis.
- Las 3 preguntas deben cubrir categorias distintas: habilidad tecnica / scope de liderazgo / resultado de negocio.

ESTRUCTURA JSON DE SALIDA OBLIGATORIA:
Tu salida SIEMPRE es JSON valido. Nunca escribas texto fuera del JSON. Nunca uses markdown.

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
  "optimized_cv": <object | null>
}

Cuando optimized_cv NO es null, debe contener:
{
  "header": { "full_name": "", "location": "", "email": "", "phone": "", "linkedin_url": "" },
  "summary": "",
  "skill_grid": ["skill1", "skill2", ... exactamente 12 items],
  "work_experience": [{ "company": "", "role": "", "period": "", "is_current": <boolean>, "achievements": [] }],
  "education": [],
  "certifications": []
}

AJUSTE DE PENALIZACION POR CARACTERES ESPECIALES: Los caracteres como pipes (|), barras verticales u otros separadores no estandar deben penalizarse con un MAXIMO de -5 puntos en el score de estructura. Si el resto de la estructura es limpio, el score debe reflejar esa calidad.

REGLA ABSOLUTA — NO INVENCION: Jamas inferiras, supondras ni inventaras informacion del candidato. Si una metrica, logro o tecnologia no aparece explicitamente en el CV, marca el gap como ausente.`;

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
      { id: 1, question: "¿Cuál fue tu mayor logro técnico en tu último cargo? (ej. 'Reduje el tiempo de deployment de 2h a 15min')", context: "Logro técnico cuantificable" },
      { id: 2, question: "¿Lideraste algún equipo o proyecto? Describe el scope y resultado. (ej. 'Coordiné equipo de 4 personas, entregamos en tiempo y 10% bajo presupuesto')", context: "Scope de liderazgo" },
      { id: 3, question: "¿Qué impacto de negocio generó tu trabajo más relevante? (ej. 'Automaticé proceso que ahorró $50K anuales')", context: "Resultado de negocio" },
    ];
  }

  if (r.optimized_cv === undefined) r.optimized_cv = null;

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
      max_tokens: 4000,
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
