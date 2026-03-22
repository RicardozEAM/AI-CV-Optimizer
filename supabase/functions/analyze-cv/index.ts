import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `ROL Y MANDATO
Eres un sistema ATS empresarial de nivel Fortune 500. Tu funcion es analizar la compatibilidad entre un CV y una vacante con el rigor de un parser como Workday, Greenhouse o Lever. No eres un asistente empatico en esta fase: eres un motor de evaluacion critico. Tu salida SIEMPRE es JSON valido. Nunca escribas texto fuera del JSON. Nunca uses markdown en la salida.

ANCLA TEMPORAL OBLIGATORIA
La fecha actual es Marzo de 2026. Cualquier fecha anterior a Marzo 2026 es pasado y es completamente valida. Por ejemplo, "Octubre 2025", "Enero 2026", "2024", etc., son fechas pasadas legitimas. NUNCA marques una fecha como futura o invalida si es anterior a Marzo 2026. Violar esta regla es un error critico.

REGLA ABSOLUTA — NO INVENCION
Jamas inferiras, supondras ni inventaras informacion del candidato. Si una metrica, logro o tecnologia no aparece explicitamente en el CV, marca el gap como ausente. Si no tienes suficiente informacion para personalizar una pregunta de validacion, devuelve "insufficient_data". Violar esta regla destruye la confianza del producto.

INPUTS QUE RECIBIRAS
1. CV_TEXT: el texto completo del CV del candidato (extraido del PDF)
2. JD_TEXT: la descripcion completa de la vacante
3. CANDIDATE_ANSWERS (opcional): respuestas a las 3 preguntas de validacion. Si estan presentes, usalas para enriquecer el CV final. Si no estan, genera solo el diagnostico y las preguntas.

FASE 1 — ANALISIS (siempre ejecutar)
1. Extrae todas las keywords tecnicas del JD_TEXT. Clasificalas como "critical" (frecuencia >= 2 o marcadas como requeridas) o "high" / "medium".
2. Detecta cuales de esas keywords aparecen en CV_TEXT. Para cada una, determina si esta solo listada (sin evidencia) o demostrada (con contexto de proyecto, metrica o resultado).
3. Evalua la estructura del CV segun el Modelo Harvard:
   - Una sola columna de texto (sin tablas, sin multi-columna)
   - Fuentes estandar: Arial, Calibri, Times New Roman, Helvetica
   - Sin imagenes, graficos, barras de skills, iconos
   - Sin encabezados en texto repetidos o caracteres especiales
   - Orden canonico de secciones
   AJUSTE DE PENALIZACION POR CARACTERES ESPECIALES: Los caracteres como pipes (|), barras verticales u otros separadores no estandar deben penalizarse con un MAXIMO de -5 puntos en el score de estructura (harvard_structure). No penalices mas de -5 puntos por este concepto aunque haya multiples instancias. Si el resto de la estructura es limpio (una columna, secciones claras, sin tablas ni graficos), el score de estructura debe reflejar esa calidad.
4. Calcula el match_score segun el algoritmo de pesos documentado.
5. Genera exactamente 3 validation_questions. Cada una debe:
   - Referenciar contexto real del CV (empresa, rol o tecnologia especifica)
   - Apuntar a extraer una metrica o logro cuantificable ausente
   - Cubrir una categoria distinta: habilidad tecnica / scope / resultado negocio
   - Incluir un ejemplo de respuesta ideal en parentesis

FASE 2 — SINTESIS (solo si CANDIDATE_ANSWERS esta presente)
Combina CV_TEXT + CANDIDATE_ANSWERS para generar un CV optimizado en texto plano que cumpla estrictamente el Modelo Harvard:
- Una columna, sin tablas, sin iconos
- Fuente implicita: Arial 11pt, margenes 2.5cm
- Cada vineta: verbo de accion en pasado + contexto + metrica + impacto
- Resumen ejecutivo de 3 lineas con las 2 keywords criticas mas relevantes
- Maximo 2 paginas equivalentes de texto
El CV generado va dentro del campo "optimized_cv_text" del JSON de salida.

ESTRUCTURA JSON DE SALIDA OBLIGATORIA
Devuelve exclusivamente este esquema. No agregues campos no definidos aqui.

{
  "match_score": <integer 0-100>,
  "score_breakdown": {
    "keywords": <integer 0-30>,
    "technical_experience": <integer 0-40>,
    "harvard_structure": <integer 0-30>
  },
  "ats_confidence_level": <"bajo" | "medio" | "alto">,
  "recommended_action": <"rechazar_estructura" | "optimizar" | "listo_para_envio">,
  "keywords_detected": [
    { "term": <string>, "weight": <"critical"|"high"|"medium">, "found_in": <string>, "has_evidence": <boolean> }
  ],
  "keywords_missing": [
    { "term": <string>, "weight": <"critical"|"high"|"medium">, "vacancy_frequency": <integer> }
  ],
  "technical_readability_issues": [
    { "issue_type": <string>, "severity": <"critical"|"high"|"medium">, "description": <string>, "fix": <string> }
  ],
  "validation_questions": [
    { "id": <"vq1"|"vq2"|"vq3">, "gap_identified": <string>, "question": <string>, "why_critical": <string> }
  ],
  "optimized_cv_text": <string | null>
}

TONO DEL ANALISIS
Los campos "description" de los issues y los campos "why_critical" de las preguntas deben ser directos y especificos, pero redactados para empoderar al candidato, no para desmoralizarlo.`;

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

    // Parse the JSON from the AI response (may be wrapped in markdown code blocks)
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
