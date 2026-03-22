import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StepFlowSection from "@/components/StepFlowSection";
import ResultsSection from "@/components/ResultsSection";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <div id="como-funciona">
      <StepFlowSection />
    </div>
    <div id="resultados">
      <ResultsSection />
    </div>
    <footer className="border-t py-8">
      <div className="container text-center text-sm text-muted-foreground">
        © 2026 CVOptimizer · Optimiza tu CV con IA
      </div>
    </footer>
  </div>
);

export default Index;
