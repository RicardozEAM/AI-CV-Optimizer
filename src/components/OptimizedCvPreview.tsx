import { useState } from "react";
import { Copy, Check, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface OptimizedCvPreviewProps {
  cvText: string;
}

const OptimizedCvPreview = ({ cvText }: OptimizedCvPreviewProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cvText);
    setCopied(true);
    toast({ title: "Copiado", description: "El CV se copió al portapapeles." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Generate a simple text file download (PDF generation could be added later)
    const blob = new Blob([cvText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CV-Harvard-Optimizado.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Descargado", description: "Tu CV se descargó como archivo de texto." });
  };

  return (
    <div className="mx-auto max-w-5xl mt-8 animate-fade-up">
      <div className="glass-card rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <FileText className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">CV Harvard Optimizado</h3>
              <p className="text-xs text-muted-foreground">Listo para enviar — formato ATS-friendly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-input/50 p-8 max-h-[600px] overflow-y-auto shadow-inner">
          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {cvText}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default OptimizedCvPreview;
