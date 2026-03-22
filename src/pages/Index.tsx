import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";
import ValidationQuestionsForm from "@/components/ValidationQuestionsForm";
import type { CVAnalysisResult } from "@/lib/types";
import { analyzeCv } from "@/lib/analyze-cv";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResult | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  // Store raw inputs for re-analysis
  const cvTextRef = useRef("");
  const jdTextRef = useRef("");

  const handleAnalysisComplete = (result: CVAnalysisResult, cvText?: string, jdText?: string) => {
    setAnalysisResult(result);
    if (cvText) cvTextRef.current = cvText;
    if (jdText) jdTextRef.current = jdText;
  };

  const handleValidationSubmit = async (answers: Record<string, string>) => {
    setIsReanalyzing(true);
    try {
      const result = await analyzeCv(cvTextRef.current, jdTextRef.current, answers);
      setAnalysisResult(result);
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
      toast({ title: "CV Harvard generado", description: "Tu CV optimizado está listo. Revisa los resultados actualizados." });
    } catch (err: any) {
      toast({ title: "Error al recalcular", description: err.message || "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsReanalyzing(false);
    }
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
        {analysisResult?.validation_questions && analysisResult.validation_questions.length > 0 && !analysisResult.optimized_cv_text && (
          <div className="bg-secondary/40 pb-20">
            <div className="container">
              <ValidationQuestionsForm
                questions={analysisResult.validation_questions}
                onSubmit={handleValidationSubmit}
                isSubmitting={isReanalyzing}
              />
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
