import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";
import ValidationQuestionsForm from "@/components/ValidationQuestionsForm";

import OptimizedCvPreview from "@/components/OptimizedCvPreview";
import type { CVAnalysisResult } from "@/lib/types";
import { analyzeCv } from "@/lib/analyze-cv";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTIONS_TIMEOUT_MS = 10_000;
const SILENT_RETRY_DELAY_MS = 4_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type OptimizationPhase =
  | "idle"
  | "analyzing"
  | "awaiting_answers"
  | "reanalyzing"
  | "complete";

interface AppState {
  phase: OptimizationPhase;
  analysisResult: CVAnalysisResult | null;
  stagedResult: CVAnalysisResult | null;
  questionsTimedOut: boolean;
  isRegenerating: boolean;
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

function hasValidQuestions(result: CVAnalysisResult | null): boolean {
  return !!(
    result?.validation_questions &&
    Array.isArray(result.validation_questions) &&
    result.validation_questions.length > 0
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const [state, setState] = useState<AppState>({
    phase: "idle",
    analysisResult: null,
    stagedResult: null,
    questionsTimedOut: false,
    isRegenerating: false,
  });
  

  const cvTextRef = useRef("");
  const jdTextRef = useRef("");
  const validationRef = useRef<HTMLDivElement>(null);

  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>();
  const retryIdRef = useRef<ReturnType<typeof setTimeout>>();

  const showValidationForm =
    state.phase === "awaiting_answers" &&
    hasValidQuestions(state.analysisResult) &&
    !hasValidOptimizedCV(state.analysisResult);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutIdRef.current);
      clearTimeout(retryIdRef.current);
    };
  }, []);

  // Auto-scroll to validation form
  useEffect(() => {
    if (!showValidationForm) return;
    const timer = setTimeout(() => {
      validationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    return () => clearTimeout(timer);
  }, [showValidationForm]);

  // Smart timeout: silent retry → then show error
  useEffect(() => {
    clearTimeout(timeoutIdRef.current);
    clearTimeout(retryIdRef.current);

    const shouldStartTimer =
      state.phase === "awaiting_answers" && !hasValidQuestions(state.analysisResult);

    if (!shouldStartTimer) {
      if (state.questionsTimedOut) {
        setState((s) => ({ ...s, questionsTimedOut: false }));
      }
      return;
    }

    retryIdRef.current = setTimeout(async () => {
      if (!cvTextRef.current || !jdTextRef.current) return;
      try {
        const result = await analyzeCv(cvTextRef.current, jdTextRef.current);
        if (isValidAnalysisResult(result) && hasValidQuestions(result)) {
          setState((s) => ({ ...s, analysisResult: result, questionsTimedOut: false }));
          return;
        }
      } catch {
        // Silent — let the outer timeout handle the UI
      }

      timeoutIdRef.current = setTimeout(() => {
        setState((s) => ({ ...s, questionsTimedOut: true }));
      }, QUESTIONS_TIMEOUT_MS - SILENT_RETRY_DELAY_MS);
    }, SILENT_RETRY_DELAY_MS);

    return () => {
      clearTimeout(timeoutIdRef.current);
      clearTimeout(retryIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.analysisResult]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

      setState({
        phase: "awaiting_answers",
        analysisResult: result,
        stagedResult: null,
        questionsTimedOut: false,
        isRegenerating: false,
      });
    },
    [],
  );

  const handleRegenerate = useCallback(async () => {
    if (!cvTextRef.current || !jdTextRef.current) return;

    setState((s) => ({ ...s, isRegenerating: true, questionsTimedOut: false }));

    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current);
      if (!isValidAnalysisResult(result)) throw new Error("Respuesta del servidor inválida");

      setState((s) => ({
        ...s,
        analysisResult: result,
        isRegenerating: false,
        questionsTimedOut: !hasValidQuestions(result),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error al regenerar", description: msg, variant: "destructive" });
      setState((s) => ({ ...s, isRegenerating: false, questionsTimedOut: true }));
    }
  }, []);

  const handleValidationSubmit = useCallback(async (answers: Record<string, string>) => {
    setState((s) => ({ ...s, phase: "reanalyzing" }));

    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current, answers);
      if (!isValidAnalysisResult(result)) throw new Error("Respuesta del servidor inválida");

      if (!hasValidOptimizedCV(result)) {
        toast({
          title: "Advertencia",
          description: "El CV optimizado no pudo generarse correctamente. Intenta de nuevo.",
          variant: "destructive",
        });
        setState((s) => ({ ...s, phase: "awaiting_answers" }));
        return;
      }

      setState((s) => ({
        ...s,
        phase: "complete",
        analysisResult: result,
        stagedResult: null,
      }));

      setTimeout(() => {
        document.getElementById("cv-optimizado")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error al recalcular", description: msg, variant: "destructive" });
      setState((s) => ({ ...s, phase: "awaiting_answers" }));
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onAnalysisComplete={handleAnalysisComplete} />

      <div id="como-funciona">
        <StepFlowSection />
      </div>

      <div id="resultados">
        {/* Results — isolated so a render crash here doesn't kill the whole page */}
        <ErrorBoundary name="ResultsSection">
          <ResultsSection result={state.analysisResult} />
        </ErrorBoundary>

        {/* Scroll-down hint */}
        {state.analysisResult && showValidationForm && (
          <div className="flex justify-center -mt-8 pb-4 bg-secondary/40">
            <button
              onClick={() =>
                validationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="animate-bounce text-primary/60 hover:text-primary transition-colors"
              aria-label="Ir a preguntas de validación"
            >
              <ChevronDown className="h-8 w-8" />
            </button>
          </div>
        )}

        {/* Validation Form */}
        {showValidationForm && (
          <div ref={validationRef} className="bg-secondary/40 pb-20">
            <div className="container">
              <ErrorBoundary name="ValidationForm">
                <ValidationQuestionsForm
                  questions={state.analysisResult!.validation_questions}
                  onSubmit={handleValidationSubmit}
                  isSubmitting={state.phase === "reanalyzing"}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Timeout fallback with manual regenerate */}
        {state.analysisResult &&
          !hasValidQuestions(state.analysisResult) &&
          state.questionsTimedOut &&
          state.phase === "awaiting_answers" && (
            <div className="bg-secondary/40 pb-20">
              <div className="container flex flex-col items-center gap-4 pt-8">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No se pudieron cargar las preguntas de optimización. Esto puede ocurrir si el
                  análisis fue incompleto.
                </p>
                <Button
                  onClick={handleRegenerate}
                  disabled={state.isRegenerating}
                  variant="outline"
                  className="gap-2"
                >
                  {state.isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Re-generar preguntas de optimización
                </Button>
              </div>
            </div>
          )}

        {/* Optimized CV — only rendered when state is 100% complete and validated */}
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
          © 2026 CVOptimizer · Optimiza tu CV con IA
        </div>
      </footer>
    </div>
  );
};

export default Index;
