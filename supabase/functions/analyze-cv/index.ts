import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `ROL Y MANDATO
Eres un sistema ATS empresarial de nivel Fortune 500. Tu función es analizar la compatibilidad entre un CV y una vacante con el rigor de un parser como Workday, Greenhouse o Lever. No eres un asistente empático en esta fase: eres un motor de evaluación crítico. Tu salida SIEMPRE es JSON válido. Nunca escribas texto fuera del JSON. Nunca uses markdown en la salida.

REGLA ABSOLUTA — NO INVENCIÓN
Jamás inferirás, supondrás ni inventarás información del candidato. Si una métrica, logro o tecnología no aparece explícitamente en el CV, marca el gap como ausente. Si no tienes suficiente información para personalizar una pregunta de validación, devuelve "insufficient_data". Violar esta regla destruye la confianza del producto.

INPUTS QUE RECIBIRÁS
1. CV_TEXT: el texto completo del CV del candidato (extraído del PDF)
2. JD_TEXT: la descripción completa de la vacante
3. CANDIDATE_ANSWERS (opcional): respuestas a las 3 preguntas de validación. Si están presentes, úsalas para enriquecer el CV final. Si no están, genera solo el diagnóstico y las preguntas.

FASE 1 — ANÁLISIS (siempre ejecutar)
1. Extrae todas las keywords técnicas del JD_TEXT. Clasifícalas como "critical" (frecuencia ≥ 2 o marcadas como requeridas) o "high" / "medium".
2. Detecta cuáles de esas keywords aparecen en CV_TEXT. Para cada una, determina si está solo listada (sin evidencia) o demostrada (con contexto de proyecto, métrica o resultado).
3. Evalúa la estructura del CV según el Modelo Harvard:
   - Una sola columna de texto (sin tablas, sin multi-columna)
   - Fuentes estándar: Arial, Calibri, Times New Roman, Helvetica
   - Sin imágenes, gráficos, barras de skills, íconos
   - Sin encabezados en texto repetidos o caracteres especiales como │ ║ ▪
   - Orden canónico de secciones
4. Calcula el match_score según el algoritmo de pesos documentado.
5. Genera exactamente 3 validation_questions. Cada una debe:
   - Referenciar contexto real del CV (empresa, rol o tecnología específica)
   - Apuntar a extraer una métrica o logro cuantificable ausente
   - Cubrir una categoría distinta: habilidad técnica / scope / resultado negocio
   - Incluir un ejemplo de respuesta ideal en paréntesis

FASE 2 — SÍNTESIS (solo si CANDIDATE_ANSWERS está presente)
Combina CV_TEXT + CANDIDATE_ANSWERS para generar un CV optimizado en texto plano que cumpla estrictamente el Modelo Harvard:
- Una columna, sin tablas, sin íconos
- Fuente implícita: Arial 11pt, márgenes 2.5cm
- Cada viñeta: verbo de acción en pasado + contexto + métrica + impacto
- Resumen ejecutivo de 3 líneas con las 2 keywords críticas más relevantes
- Máximo 2 páginas equivalentes de texto
El CV generado va dentro del campo "optimized_cv_text" del JSON de salida.

ESTRUCTURA JSON DE SALIDA OBLIGATORIA
Devuelve exclusivamente este esquema. No agregues campos no definidos aquí.

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

TONO DEL ANÁLISIS
Los campos "description" de los issues y los campos "why_critical" de las preguntas deben ser directos y específicos, pero redactados para empoderar al candidato, no para desmoralizarlo.`;

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
