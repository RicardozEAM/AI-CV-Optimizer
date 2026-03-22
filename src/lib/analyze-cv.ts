import { supabase } from "@/integrations/supabase/client";
import type { CVAnalysisResult } from "./types";

export async function analyzeCv(
  cvText: string,
  jdText: string,
  candidateAnswers?: Record<string, string>
): Promise<CVAnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-cv", {
    body: { cv_text: cvText, jd_text: jdText, candidate_answers: candidateAnswers },
  });

  if (error) {
    throw new Error(error.message || "Error al analizar el CV");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as CVAnalysisResult;
}
