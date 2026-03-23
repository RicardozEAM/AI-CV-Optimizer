import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cv_text, jd_text, candidate_answers } = await req.json();

    if (!cv_text || !jd_text) {
      return new Response(
        JSON.stringify({ error: "cv_text y jd_text son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = `CV_TEXT:\n${cv_text}\n\nJD_TEXT:\n${jd_text}`;
    if (candidate_answers) {
      userPrompt += `\n\nCANDIDATE_ANSWERS:\n${JSON.stringify(candidate_answers)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content in AI response");
    }

    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const analysisResult = JSON.parse(jsonStr);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-cv error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
