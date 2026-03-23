// V2.0 JSON Schema Types

export interface StructureAlert {
  type: "warning" | "error" | "info";
  message: string;
  fix: string;
}

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

export interface ValidationQuestion {
  id: number;
  question: string;
  context: string;
}

export interface ScoringDetails {
  keywords: number;
  experience: number;
  structure: number;
}

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  is_current: boolean;
  achievements: string[];
}

export interface CVHeader {
  full_name: string;
  location: string;
  email: string;
  phone: string;
  linkedin_url: string;
}

export interface OptimizedCv {
  header: CVHeader;
  summary: string;
  skill_grid: string[];
  work_experience: WorkExperience[];
  education: string[];
  certifications: string[];
}

export interface CVAnalysisResult {
  analysis: {
    match_score: number;
    scoring_details: ScoringDetails;
    keywords_detected: KeywordDetected[];
    keywords_missing: KeywordMissing[];
    structure_alerts: StructureAlert[];
  };
  validation_questions: ValidationQuestion[];
  optimized_cv: OptimizedCv | null;
}
