import {
  useState,
  useRef,
  useCallback,
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
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptimizationPhase = "idle" | "analyzing" | "awaiting_answers" | "generating_cv" | "complete";

interface AppState {
  phase: OptimizationPhase;
  analysisResult: CVAnalysisResult | null;
  isRegenerating: boolean;
  submittedAnswers: Record<string, string> | null;
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

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const [state, setState] = useState<AppState>({
    phase: "idle",
    analysisResult: null,
    isRegenerating: false,
    submittedAnswers: null,
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
        phase: "complete",
        analysisResult: {
          ...result,
          validation_questions: s.analysisResult?.validation_questions ?? result.validation_questions,
        },
        submittedAnswers: answers,
      }));
      setTimeout(() => {
        document.getElementById("cv-optimizado")?.scrollIntoView({ behavior: "smooth" });
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
        analysisResult: { ...result, optimized_cv: null },
        isRegenerating: false,
        submittedAnswers: null,
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
        analysisResult: { ...result, optimized_cv: null },
        isRegenerating: false,
        submittedAnswers: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error al regenerar", description: msg, variant: "destructive" });
      setState((s) => ({ ...s, isRegenerating: false }));
    }
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
                  locked={state.phase === "complete"}
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
                      <p className="text-sm font-semibold text-foreground">
                        Generando CV estandarizado (formato Harvard)...
                      </p>
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
