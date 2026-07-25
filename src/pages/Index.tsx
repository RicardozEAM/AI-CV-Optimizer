import {
  useState,
  useRef,
  useCallback,
  useEffect,
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";
import PhoneScreenGuide from "@/components/PhoneScreenGuide";
import OptimizedCvPreview from "@/components/OptimizedCvPreview";
import type { CVAnalysisResult } from "@/lib/types";
import { analyzeCv } from "@/lib/analyze-cv";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, AlertTriangle, TrendingUp, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptimizationPhase =
  | "idle"
  | "analyzing"
  | "awaiting_answers"
  | "generating_cv"
  | "reviewing_improvements"
  | "complete";

interface AppState {
  phase: OptimizationPhase;
  analysisResult: CVAnalysisResult | null;
  isRegenerating: boolean;
  submittedAnswers: Record<string, string> | null;
  previousScore: number | null;
  pendingOptimizedCv: CVAnalysisResult["optimized_cv"] | null;
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? "unknown"}]`, error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-destructive">
              Algo salió mal en esta sección.
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message ?? "Error desconocido"}
            </p>
            <Button variant="outline" onClick={this.handleReset}>
              Reintentar
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ─── Guards ───────────────────────────────────────────────────────────────────

function isValidAnalysisResult(result: unknown): result is CVAnalysisResult {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  if (!r.analysis || typeof r.analysis !== "object") return false;
  if (!Array.isArray(r.validation_questions)) return false;
  return true;
}

function hasValidOptimizedCV(result: CVAnalysisResult | null): boolean {
  if (!result?.optimized_cv) return false;
  const cv = result.optimized_cv;
  return !!(cv.header && cv.summary && Array.isArray(cv.work_experience));
}
// ─── Rotating phrase ──────────────────────────────────────────────────────────

function RotatingPhrase({ phrases, intervalMs = 1800 }: { phrases: string[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % phrases.length), intervalMs);
    return () => clearInterval(t);
  }, [phrases.length, intervalMs]);
  return (
    <p key={idx} className="text-sm font-semibold text-foreground animate-fade-up">
      {phrases[idx]}
    </p>
  );
}


// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const [state, setState] = useState<AppState>({
    phase: "idle",
    analysisResult: null,
    isRegenerating: false,
    submittedAnswers: null,
    previousScore: null,
    pendingOptimizedCv: null,
  });

  const cvTextRef = useRef("");
  const jdTextRef = useRef("");

  const generateOptimizedCv = useCallback(async (answers: Record<string, string>) => {
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current, answers);
      if (!isValidAnalysisResult(result) || !hasValidOptimizedCV(result)) {
        throw new Error("No se pudo generar el CV estandarizado");
      }
      setState((s) => ({
        ...s,
        phase: "reviewing_improvements",
        previousScore: s.analysisResult?.analysis.match_score ?? null,
        analysisResult: {
          ...result,
          validation_questions: s.analysisResult?.validation_questions ?? result.validation_questions,
          // Ocultamos el CV Harvard hasta que el reclutador lo solicite explícitamente
          optimized_cv: result.optimized_cv?.header
            ? ({ header: result.optimized_cv.header, summary: "", skill_grid: [], work_experience: [], education: [], certifications: [] })
            : null,
        },
        pendingOptimizedCv: result.optimized_cv,
        submittedAnswers: answers,
      }));
      setTimeout(() => {
        document.getElementById("mejoras")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error al generar CV", description: msg, variant: "destructive" });
      setState((s) => ({ ...s, phase: "awaiting_answers" }));
    }
  }, []);


  const handleAnalysisComplete = useCallback(
    (result: CVAnalysisResult, cvText?: string, jdText?: string) => {
      if (!isValidAnalysisResult(result)) {
        toast({
          title: "Análisis incompleto",
          description: "La respuesta del servidor no tiene el formato esperado. Intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      if (cvText) cvTextRef.current = cvText;
      if (jdText) jdTextRef.current = jdText;

      // Nuevo flujo: primero mostramos diagnóstico + Guía de Phone Screen.
      // El CV Harvard se genera solo cuando el reclutador envíe las respuestas del candidato.
      setState({
        phase: "awaiting_answers",
        analysisResult: {
          ...result,
          optimized_cv: result.optimized_cv?.header
            ? ({ header: result.optimized_cv.header, summary: "", skill_grid: [], work_experience: [], education: [], certifications: [] })
            : null,
        },
        isRegenerating: false,
        submittedAnswers: null,
        previousScore: null,
        pendingOptimizedCv: null,
      });

      setTimeout(() => {
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    },
    [],
  );

  const handleSubmitAnswers = useCallback(
    (answers: Record<string, string>) => {
      if (!cvTextRef.current || !jdTextRef.current) return;
      setState((s) => ({ ...s, phase: "generating_cv", submittedAnswers: answers }));
      generateOptimizedCv(answers);
    },
    [generateOptimizedCv],
  );

  const handleRegenerate = useCallback(async () => {
    if (!cvTextRef.current || !jdTextRef.current) return;
    setState((s) => ({ ...s, isRegenerating: true }));
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current);
      if (!isValidAnalysisResult(result)) throw new Error("Respuesta inválida");
      setState({
        phase: "awaiting_answers",
        analysisResult: {
          ...result,
          optimized_cv: result.optimized_cv?.header
            ? ({ header: result.optimized_cv.header, summary: "", skill_grid: [], work_experience: [], education: [], certifications: [] })
            : null,
        },
        isRegenerating: false,
        submittedAnswers: null,
        previousScore: null,
        pendingOptimizedCv: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error al regenerar", description: msg, variant: "destructive" });
      setState((s) => ({ ...s, isRegenerating: false }));
    }
  }, []);

  const handleRevealHarvardCv = useCallback(() => {
    setState((s) => {
      if (!s.pendingOptimizedCv || !s.analysisResult) return s;
      return {
        ...s,
        phase: "complete",
        analysisResult: { ...s.analysisResult, optimized_cv: s.pendingOptimizedCv },
      };
    });
    setTimeout(() => {
      document.getElementById("cv-optimizado")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }, []);

  const questions = state.analysisResult?.validation_questions ?? [];

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onAnalysisComplete={handleAnalysisComplete} />

      <div id="como-funciona">
        <StepFlowSection />
      </div>

      <div id="resultados">
        <ErrorBoundary name="ResultsSection">
          <ResultsSection result={state.analysisResult} />
        </ErrorBoundary>

        {state.analysisResult && questions.length > 0 && (
          <div className="bg-secondary/40 pb-12">
            <div className="container">
              <ErrorBoundary name="PhoneScreenGuide">
                <PhoneScreenGuide
                  questions={questions}
                  onSubmitAnswers={
                    state.phase === "awaiting_answers" ? handleSubmitAnswers : undefined
                  }
                  isSubmitting={state.phase === "generating_cv"}
                  locked={state.phase === "reviewing_improvements" || state.phase === "complete"}
                  submittedAnswers={state.submittedAnswers}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {state.analysisResult && (
          <div className="flex justify-center pb-6 bg-secondary/40">
            <Button
              onClick={handleRegenerate}
              disabled={state.isRegenerating || state.phase === "generating_cv"}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {state.isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Volver a analizar el perfil
            </Button>
          </div>
        )}

        {state.phase === "generating_cv" && (
          <div className="bg-secondary/40 pb-20">
            <div className="container">
              <div className="mx-auto max-w-5xl mt-8">
                <div className="glass-card rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    </div>
                    <div>
                      <RotatingPhrase
                        phrases={[
                          "Actualizando puntuación...",
                          "Analizando potencial del candidato...",
                          "Cruzando respuestas con la vacante...",
                          "Recalibrando keywords detectadas...",
                          "Consolidando nueva evidencia técnica...",
                        ]}
                      />
                      <p className="text-xs text-muted-foreground">Esto puede tomar unos segundos</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 rounded-full bg-muted animate-pulse w-1/3 mx-auto" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-1/2 mx-auto" />
                    <div className="h-px bg-muted my-4" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-full" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-5/6" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-4/6" />
                    <div className="grid grid-cols-3 gap-2 my-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-7 rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                    <div className="h-3 rounded-full bg-muted animate-pulse w-full" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-5/6" />
                    <div className="h-3 rounded-full bg-muted animate-pulse w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.phase === "reviewing_improvements" && state.analysisResult && (
          <div id="mejoras" className="bg-secondary/40 pb-12">
            <div className="container">
              <div className="mx-auto max-w-5xl mt-8">
                <div className="glass-card rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Score actualizado con respuestas del candidato
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Reanálisis del perfil incluyendo la evidencia recolectada en el Phone Screen
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 mb-6">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Score inicial</p>
                      <p className="mt-2 text-3xl font-bold text-muted-foreground">
                        {state.previousScore ?? "—"}
                        <span className="text-base font-medium text-muted-foreground">%</span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs uppercase tracking-wide text-primary">Score actualizado</p>
                      <p className="mt-2 text-3xl font-bold text-primary">
                        {state.analysisResult.analysis.match_score}
                        <span className="text-base font-medium text-primary/80">%</span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Variación</p>
                      <p className="mt-2 text-3xl font-bold text-foreground flex items-center gap-1">
                        {state.previousScore !== null ? (
                          <>
                            {state.analysisResult.analysis.match_score - state.previousScore >= 0 ? "+" : ""}
                            {state.analysisResult.analysis.match_score - state.previousScore}
                            <span className="text-base font-medium">pts</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-5 mb-6">
                    <p className="text-sm font-semibold text-foreground mb-3">Detalle del reanálisis</p>
                    <div className="grid gap-3 sm:grid-cols-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Keywords</p>
                        <p className="font-semibold text-foreground">
                          {state.analysisResult.analysis.scoring_details.keywords}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Experiencia</p>
                        <p className="font-semibold text-foreground">
                          {state.analysisResult.analysis.scoring_details.experience}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estructura</p>
                        <p className="font-semibold text-foreground">
                          {state.analysisResult.analysis.scoring_details.structure}%
                        </p>
                      </div>
                    </div>
                    {state.analysisResult.analysis.keywords_detected.filter((k) => k.has_evidence).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Nueva evidencia validada en Phone Screen
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {state.analysisResult.analysis.keywords_detected
                            .filter((k) => k.has_evidence)
                            .slice(0, 12)
                            .map((k) => (
                              <span
                                key={k.term}
                                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                              >
                                {k.term}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Cuando el score refleje el perfil real del candidato, genera el CV en formato Harvard.
                    </p>
                    <Button onClick={handleRevealHarvardCv} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Generar CV Harvard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {state.phase === "complete" && hasValidOptimizedCV(state.analysisResult) && (
          <div id="cv-optimizado" className="bg-secondary/40 pb-20">
            <div className="container">
              <ErrorBoundary name="OptimizedCvPreview">
                <OptimizedCvPreview cv={state.analysisResult!.optimized_cv!} />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 TechScreen AI · TA Portal · Uso interno para reclutadores IT
        </div>
      </footer>
    </div>
  );
};

export default Index;
