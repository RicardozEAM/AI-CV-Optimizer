import { useState, useRef } from "react";
import { Upload, Link2, FileText, X, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [isExtractingJd, setIsExtractingJd] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

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
    <section className="relative border-b border-border bg-background py-16 md:py-24">
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            TechScreen AI · TA Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground text-balance" style={{ lineHeight: 1.1 }}>
            Estandariza perfiles <span className="text-primary">técnicos</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            Herramienta interna para reclutadores IT: analiza perfiles técnicos, identifica brechas y estandariza CVs para presentar a gerencia y clientes.
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
                <h3 className="font-semibold text-foreground text-sm">CV del candidato</h3>
                <p className="text-xs text-muted-foreground whitespace-nowrap">PDF o DOCX, máx. 5MB · ej. FullStack Web Developer Senior</p>
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
                <p className="text-sm font-medium text-foreground">Arrastra el CV del candidato aquí</p>
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
                <h3 className="font-semibold text-foreground text-sm">Descripción de la vacante</h3>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Perfil objetivo · ej. FullStack Web Developer Senior</p>
              </div>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
              placeholder="Pega aquí la descripción del puesto o adjunta el documento (PDF/DOCX)..."
              className="w-full resize-none rounded-xl border border-input bg-secondary/50 p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all h-[140px]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              {jdFile ? (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-1.5 text-xs flex-1 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground truncate flex-1">{jdFile.name}</span>
                  <button
                    onClick={() => { setJdFile(null); setJobDescription(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label="Quitar documento"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => jdFileInputRef.current?.click()}
                  disabled={isExtractingJd}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors disabled:opacity-60"
                >
                  {isExtractingJd ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Extrayendo texto...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      Adjuntar PDF o DOCX
                    </>
                  )}
                </button>
              )}
              <p className={`text-right text-[11px] tabular-nums shrink-0 ${
                jobDescription.length >= MAX_JD_CHARS
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }`}>
                {jobDescription.length}/{MAX_JD_CHARS}
              </p>
            </div>
            <input
              ref={jdFileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={async (e) => {
                const selected = e.target.files?.[0];
                e.target.value = "";
                if (!selected) return;
                if (!isValidFile(selected)) {
                  toast({ title: "Formato no válido", description: "Solo se aceptan archivos PDF o DOCX.", variant: "destructive" });
                  return;
                }
                if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                  toast({ title: "Archivo muy grande", description: `El archivo no debe superar ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
                  return;
                }
                setIsExtractingJd(true);
                try {
                  const text = await extractText(selected);
                  if (!text.trim()) {
                    toast({ title: "Documento vacío", description: "No se pudo extraer texto del documento. Verifica que no sea una imagen escaneada.", variant: "destructive" });
                    return;
                  }
                  setJobDescription(text.slice(0, MAX_JD_CHARS));
                  setJdFile(selected);
                  toast({ title: "Documento cargado", description: "Se extrajo la descripción del puesto correctamente." });
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "No se pudo procesar el documento.";
                  toast({ title: "Error al leer el documento", description: msg, variant: "destructive" });
                } finally {
                  setIsExtractingJd(false);
                }
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <label
            htmlFor="consent-lpdp"
            className="group flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left cursor-pointer transition-colors hover:border-primary/40"
          >
            <Checkbox
              id="consent-lpdp"
              checked={consentGiven}
              onCheckedChange={(v) => setConsentGiven(v === true)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="inline h-3.5 w-3.5 text-primary mr-1 -mt-0.5" />
              Declaro contar con el consentimiento del candidato para el tratamiento de sus datos personales, en estricto cumplimiento de la Ley de Protección de Datos Personales, exclusivamente para fines de evaluación técnica.
            </span>
          </label>

          <Button
            variant="hero"
            disabled={(!file || !jobDescription.trim()) || isAnalyzing || !consentGiven}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analizando perfil...
              </>
            ) : (
              "Analizar perfil técnico"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            {consentGiven
              ? "Uso interno · Resultado en ~15 segundos"
              : "Marca la casilla de consentimiento para habilitar el análisis"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;