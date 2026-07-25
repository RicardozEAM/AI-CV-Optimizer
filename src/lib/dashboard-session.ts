import { supabase } from "@/integrations/supabase/client";

export interface SaveSessionPayload {
  session_id?: string;
  position: string;
  candidate_name?: string;
  initial_score?: number;
  updated_score?: number;
  harvard_generated?: boolean;
  anonimized?: boolean;
  answers?: Record<string, string>;
  recruiter_email?: string;
}

export interface SaveSessionResponse {
  saved: boolean;
  session_id?: string;
}

export async function saveAnalysisSession(payload: SaveSessionPayload): Promise<SaveSessionResponse> {
  const { data, error } = await supabase.functions.invoke("save-analysis-session", {
    body: payload,
  });

  if (error) {
    console.error("[saveAnalysisSession] Edge function error:", error);
    throw new Error(error.message || "No se pudo guardar la sesión de análisis");
  }

  if (data?.error) {
    console.error("[saveAnalysisSession] Response error:", data.error);
    throw new Error(data.error);
  }

  return data as SaveSessionResponse;
}
