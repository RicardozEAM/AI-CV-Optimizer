import { supabase } from "@/integrations/supabase/client";
import type { CVAnalysisResult } from "./types";

/** Strip control chars that could break JSON serialization */
function sanitizeAnswer(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/\\/g, "\\\\")  // escape backslashes
    .replace(/"/g, '\\"')     // escape unbalanced quotes inside values
    .trim();
}

function sanitizeAnswers(answers: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    clean[key] = sanitizeAnswer(value);
  }
  return clean;
}

export async function analyzeCv(
  cvText: string,
  jdText: string,
  candidateAnswers?: Record<string, string>
): Promise<CVAnalysisResult> {
  console.log("[analyzeCv] Iniciando análisis...", { hasCandidateAnswers: !!candidateAnswers });

  const cleanAnswers = candidateAnswers ? sanitizeAnswers(candidateAnswers) : undefined;
  console.log("[analyzeCv] Respuestas sanitizadas:", cleanAnswers ? Object.keys(cleanAnswers) : "ninguna");

  const { data, error } = await supabase.functions.invoke("analyze-cv", {
    body: { cv_text: cvText, jd_text: jdText, candidate_answers: cleanAnswers },
  });

  if (error) {
    console.error("[analyzeCv] Error de Supabase:", error);
    throw new Error(error.message || "Error al analizar el CV");
  }

  if (data?.error) {
    console.error("[analyzeCv] Error en respuesta:", data.error);
    throw new Error(data.error);
  }

  console.log("[analyzeCv] Respuesta recibida:", {
    hasAnalysis: !!data?.analysis,
    hasOptimizedCv: !!data?.optimized_cv,
    questionsCount: data?.validation_questions?.length ?? 0,
  });

  return data as CVAnalysisResult;
}
