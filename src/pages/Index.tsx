import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";
import type { CVAnalysisResult } from "@/lib/types";

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection onAnalysisComplete={setAnalysisResult} />
      <div id="como-funciona">
        <StepFlowSection />
      </div>
      <div id="resultados">
        <ResultsSection result={analysisResult} />
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
