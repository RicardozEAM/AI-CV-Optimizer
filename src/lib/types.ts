export interface KeywordDetected {
  term: string;
  weight: "critical" | "high" | "medium";
  found_in: string;
  has_evidence?: boolean;
}

export interface KeywordMissing {
  term: string;
  weight: "critical" | "high" | "medium";
  vacancy_frequency: number;
}

export interface ReadabilityIssue {
  issue_type: string;
  severity: "critical" | "high" | "medium";
  description: string;
  fix: string;
}

export interface ValidationQuestion {
  id: "vq1" | "vq2" | "vq3";
  gap_identified: string;
  question: string;
  why_critical: string;
}

export interface ScoreBreakdown {
  keywords: number;
  technical_experience: number;
  harvard_structure: number;
}

export interface CVAnalysisResult {
  match_score: number;
  score_breakdown: ScoreBreakdown;
  ats_confidence_level: "bajo" | "medio" | "alto";
  recommended_action: "rechazar_estructura" | "optimizar" | "listo_para_envio";
  keywords_detected: KeywordDetected[];
  keywords_missing: KeywordMissing[];
  technical_readability_issues: ReadabilityIssue[];
  validation_questions: ValidationQuestion[];
  optimized_cv_text: string | null;
}
