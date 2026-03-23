import { useState, useRef } from "react";
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

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResult | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [pendingOptimizedResult, setPendingOptimizedResult] = useState<CVAnalysisResult | null>(null);
  const cvTextRef = useRef("");
  const jdTextRef = useRef("");

  const handleAnalysisComplete = (result: CVAnalysisResult, cvText?: string, jdText?: string) => {
    setAnalysisResult(result);
    setPaymentComplete(false);
    setPendingOptimizedResult(null);
    if (cvText) cvTextRef.current = cvText;
    if (jdText) jdTextRef.current = jdText;
  };

  const handleValidationSubmit = async (answers: Record<string, string>) => {
    setIsReanalyzing(true);
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current, answers);
      setPendingOptimizedResult(result);
      setShowPaymentModal(true);
    } catch (err: any) {
      toast({ title: "Error al recalcular", description: err.message || "Intenta de nuevo.", variant: "destructive" });
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

  const showValidationForm =
    analysisResult?.validation_questions &&
    analysisResult.validation_questions.length > 0 &&
    !analysisResult.optimized_cv &&
    !paymentComplete;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onAnalysisComplete={handleAnalysisComplete} />
      <div id="como-funciona">
        <StepFlowSection />
      </div>
      <div id="resultados">
        <ResultsSection result={analysisResult} />

        {showValidationForm && (
          <div className="bg-secondary/40 pb-20">
            <div className="container">
              <ValidationQuestionsForm
                questions={analysisResult!.validation_questions}
                onSubmit={handleValidationSubmit}
                isSubmitting={isReanalyzing}
              />
            </div>
          </div>
        )}

        {paymentComplete && analysisResult?.optimized_cv && (
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
