import { useState, useRef } from "react";
import { Upload, Link2, FileText, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractText } from "@/lib/pdf-extract";
import { analyzeCv } from "@/lib/analyze-cv";
import type { CVAnalysisResult } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface HeroSectionProps {
  onAnalysisComplete: (result: CVAnalysisResult, cvText: string, jdText: string) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const MAX_FILE_SIZE_MB = 5;
const MAX_JD_CHARS = 5000;

const HeroSection = ({ onAnalysisComplete }: HeroSectionProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    return ACCEPTED_TYPES.includes(f.type) || name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!isValidFile(dropped)) {
      toast({ title: "Formato no válido", description: "Solo se aceptan archivos PDF o DOCX.", variant: "destructive" });
      return;
    }
    if (dropped.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: `El archivo no debe superar ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: `El archivo no debe superar ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      e.target.value = "";
      return;
    }
    setFile(selected);
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription.trim()) {
      toast({ title: "Faltan datos", description: "Sube tu CV (PDF o DOCX) y pega la descripción de la vacante.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const cvText = await extractText(file);
      if (!cvText.trim()) {
        toast({ title: "Archivo vacío", description: "No se pudo extraer texto del archivo. Asegúrate de que no sea una imagen escaneada.", variant: "destructive" });
        return;
      }
      const result = await analyzeCv(cvText, jobDescription);
      onAnalysisComplete(result, cvText, jobDescription);

      setTimeout(() => {
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      const msg = err instanceof Error ? err.message : "Intenta de nuevo.";
      toast({ title: "Error en el análisis", description: msg, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />

      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center mb-12 opacity-0 animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6 shadow-[0_0_16px_hsl(158_100%_42%_/_0.1)]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Optimizador de CV con Inteligencia Artificial
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground md:text-7xl text-balance" style={{ lineHeight: 1.05 }}>
            Vence a los{" "}
            <span className="text-primary drop-shadow-[0_0_30px_hsl(158_100%_42%_/_0.4)]">Algoritmos</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground text-pretty max-w-xl mx-auto">
            Tu CV es rechazado por robots antes de llegar a un humano. Nuestra IA lo optimiza para superar los filtros ATS en segundos.
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid gap-4 md:grid-cols-2 opacity-0 animate-fade-up" style={{ animationDelay: "150ms" }}>
          {/* File Upload Card */}
          <div
            className={`card-lift glass-card rounded-2xl p-6 border border-border hover:border-primary/20 ${
              isDragging ? "ring-2 ring-primary shadow-lg shadow-primary/10 scale-[1.01] border-primary/30" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Sube tu CV</h3>
                <p className="text-xs text-muted-foreground">PDF o DOCX, máx. 5MB</p>
              </div>
            </div>

            {file ? (
              <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/15 p-4 transition-all">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground truncate flex-1">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group/drop w-full rounded-xl border-2 border-dashed border-primary/20 bg-primary/3 p-8 text-center transition-all duration-300 hover:border-primary/35 hover:bg-primary/6 active:scale-[0.98]"
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 group-hover/drop:scale-110">
                  <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover/drop:text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Arrastra tu PDF o DOCX aquí</p>
                <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
              </button>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Job Description Card */}
          <div className="card-lift glass-card rounded-2xl p-6 border border-border hover:border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Pega la vacante</h3>
                <p className="text-xs text-muted-foreground">Descripción del empleo</p>
              </div>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
              placeholder="Pega aquí la descripción del puesto al que aplicas..."
              className="w-full resize-none rounded-xl border border-input bg-secondary/50 p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all h-[140px]"
            />
            <p className={`text-right text-[11px] mt-1 tabular-nums ${
              jobDescription.length >= MAX_JD_CHARS
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            }`}>
              {jobDescription.length}/{MAX_JD_CHARS}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center opacity-0 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <Button variant="hero" disabled={(!file || !jobDescription.trim()) || isAnalyzing} onClick={handleAnalyze} className="rounded-xl px-8 h-12 text-base font-semibold shadow-[0_0_24px_hsl(158_100%_42%_/_0.3)] hover:shadow-[0_0_32px_hsl(158_100%_42%_/_0.45)] transition-all duration-300">
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analizando...
              </>
            ) : (
              "Analizar mi CV gratis"
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">Sin registro · Resultado en ~15 segundos</p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;