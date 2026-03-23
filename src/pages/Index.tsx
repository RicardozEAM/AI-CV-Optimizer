import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";
import ValidationQuestionsForm from "@/components/ValidationQuestionsForm";
import PaymentModal from "@/components/PaymentModal";
import OptimizedCvPreview from "@/components/OptimizedCvPreview";
import type { CVAnalysisResult } from "@/lib/types";
import { analyzeCv } from "@/lib/analyze-cv";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONS_TIMEOUT_MS = 5000;

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResult | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [pendingOptimizedResult, setPendingOptimizedResult] = useState<CVAnalysisResult | null>(null);
  const [questionsTimedOut, setQuestionsTimedOut] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const cvTextRef = useRef("");
  const jdTextRef = useRef("");
  const validationRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const hasQuestions =
    analysisResult?.validation_questions && analysisResult.validation_questions.length > 0;

  const showValidationForm = hasQuestions && !analysisResult?.optimized_cv && !paymentComplete;

  // Auto-scroll to validation questions when analysis completes
  useEffect(() => {
    if (showValidationForm) {
      const timer = setTimeout(() => {
        validationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showValidationForm]);

  // Timeout: if questions missing after analysis, show retry
  useEffect(() => {
    if (analysisResult && !hasQuestions && !paymentComplete) {
      timeoutRef.current = setTimeout(() => setQuestionsTimedOut(true), QUESTIONS_TIMEOUT_MS);
      return () => clearTimeout(timeoutRef.current);
    }
    setQuestionsTimedOut(false);
  }, [analysisResult, hasQuestions, paymentComplete]);

  const handleAnalysisComplete = (result: CVAnalysisResult, cvText?: string, jdText?: string) => {
    setAnalysisResult(result);
    setPaymentComplete(false);
    setPendingOptimizedResult(null);
    setQuestionsTimedOut(false);
    if (cvText) cvTextRef.current = cvText;
    if (jdText) jdTextRef.current = jdText;
  };

  const handleRegenerate = useCallback(async () => {
    if (!cvTextRef.current || !jdTextRef.current) return;
    setIsRegenerating(true);
    setQuestionsTimedOut(false);
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current);
      setAnalysisResult(result);
    } catch (err: any) {
      toast({ title: "Error al regenerar", description: err.message || "Intenta de nuevo.", variant: "destructive" });
      setQuestionsTimedOut(true);
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  const handleValidationSubmit = async (answers: Record<string, string>) => {
    setIsReanalyzing(true);
    console.log("[Index] Enviando respuestas de validación...");
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current, answers);
      console.log("[Index] Resultado recibido:", {
        hasOptimizedCv: !!result?.optimized_cv,
        score: result?.analysis?.match_score,
      });

      if (!result?.optimized_cv) {
        console.warn("[Index] optimized_cv es null — mostrando advertencia");
        toast({
          title: "CV no generado",
          description: "La IA no devolvió el CV optimizado. Intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      setPendingOptimizedResult(result);
      setShowPaymentModal(true);
    } catch (err: any) {
      console.error("[Index] Error al recalcular:", err);
      toast({
        title: "Error al generar el CV",
        description: err.message || "Hubo un error al generar el PDF, por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentComplete(true);
    if (pendingOptimizedResult) {
      setAnalysisResult(pendingOptimizedResult);
    }
    toast({ title: "¡Pago exitoso!", description: "Tu CV Harvard optimizado está listo." });
    setTimeout(() => {
      document.getElementById("cv-optimizado")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onAnalysisComplete={handleAnalysisComplete} />
      <div id="como-funciona">
        <StepFlowSection />
      </div>
      <div id="resultados">
        <ResultsSection result={analysisResult} />

        {/* Scroll indicator arrow when validation form is below */}
        {analysisResult && showValidationForm && (
          <div className="flex justify-center -mt-8 pb-4 bg-secondary/40">
            <button
              onClick={() => validationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="animate-bounce text-primary/60 hover:text-primary transition-colors"
              aria-label="Ir a preguntas de validación"
            >
              <ChevronDown className="h-8 w-8" />
            </button>
          </div>
        )}

        {/* Validation Form — always visible after diagnosis */}
        {showValidationForm && (
          <div ref={validationRef} className="bg-secondary/40 pb-20">
            <div className="container">
              <ValidationQuestionsForm
                questions={analysisResult!.validation_questions}
                onSubmit={handleValidationSubmit}
                isSubmitting={isReanalyzing}
              />
            </div>
          </div>
        )}

        {/* Timeout fallback: retry button */}
        {analysisResult && !hasQuestions && questionsTimedOut && !paymentComplete && (
          <div className="bg-secondary/40 pb-20">
            <div className="container flex flex-col items-center gap-4 pt-8">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                No se pudieron cargar las preguntas de optimización. Esto puede ocurrir si el análisis fue incompleto.
              </p>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                variant="outline"
                className="gap-2"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Re-generar preguntas de optimización
              </Button>
            </div>
          </div>
        )}

        {paymentComplete && analysisResult?.optimized_cv != null &&
          analysisResult.optimized_cv.header != null &&
          analysisResult.optimized_cv.work_experience != null && (
          <div id="cv-optimizado" className="bg-secondary/40 pb-20">
            <div className="container">
              <OptimizedCvPreview cv={analysisResult.optimized_cv} />
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        open={showPaymentModal}
        projectedScore={pendingOptimizedResult?.analysis.match_score ?? 95}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 CVOptimizer · Optimiza tu CV con IA
        </div>
      </footer>
    </div>
  );
};

export default Index;
