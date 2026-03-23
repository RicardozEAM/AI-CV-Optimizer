import { useState } from "react";
import { Copy, Check, Download, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { OptimizedCv } from "@/lib/types";
import jsPDF from "jspdf";

/**
 * Safely converts any value to a displayable string.
 * Handles the case where the AI returns objects instead of plain strings
 * (e.g. { institution: "...", degree: "...", period: "..." }).
 */
function toSafeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Try common field names first
    const preferred = obj.institution ?? obj.degree ?? obj.name ?? obj.title ?? obj.text ?? obj.description;
    if (typeof preferred === "string") {
      // Build a composite string from known fields
      const parts = [obj.degree, obj.institution, obj.period].filter(
        (v) => typeof v === "string" && v.length > 0
      );
      return parts.length > 0 ? parts.join(" — ") : preferred;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

interface OptimizedCvPreviewProps {
  cv: OptimizedCv;
}

function buildPlainText(cv: OptimizedCv): string {
  const lines: string[] = [];
  const h = cv.header;
  lines.push(h.full_name.toUpperCase());
  const contactParts = [h.location, h.phone, h.email, h.linkedin_url].filter(Boolean);
  lines.push(contactParts.join(" | "));
  lines.push("");

  lines.push("RESUMEN EJECUTIVO");
  lines.push(cv.summary);
  lines.push("");

  if (cv.skill_grid.length > 0) {
    lines.push("COMPETENCIAS CLAVE");
    for (let i = 0; i < cv.skill_grid.length; i += 3) {
      const row = cv.skill_grid.slice(i, i + 3);
      lines.push(row.map(s => toSafeString(s).padEnd(25)).join(""));
    }
    lines.push("");
  }

  lines.push("EXPERIENCIA PROFESIONAL");
  for (const job of cv.work_experience) {
    lines.push(`${job.role} — ${job.company}`);
    lines.push(job.period);
    for (const a of job.achievements) {
      lines.push(`• ${toSafeString(a)}`);
    }
    lines.push("");
  }

  if (cv.education.length > 0) {
    lines.push("EDUCACIÓN");
    for (const ed of cv.education) lines.push(`• ${toSafeString(ed)}`);
    lines.push("");
  }

  if (cv.certifications.length > 0) {
    lines.push("CERTIFICACIONES");
    for (const c of cv.certifications) lines.push(`• ${toSafeString(c)}`);
  }

  return lines.join("\n");
}

function generatePdf(cv: OptimizedCv) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 25;
  const usable = pageW - margin * 2;
  const bottomMargin = pageH - 20;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkPage = (needed: number) => { if (y + needed > bottomMargin) addPage(); };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(cv.header.full_name.toUpperCase(), pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const contactParts = [cv.header.location, cv.header.phone, cv.header.email].filter(Boolean);
  doc.text(contactParts.join("  •  "), pageW / 2, y, { align: "center" });
  y += 5;

  if (cv.header.linkedin_url) {
    doc.setTextColor(37, 99, 235);
    doc.textWithLink(cv.header.linkedin_url, pageW / 2 - doc.getTextWidth(cv.header.linkedin_url) / 2, y, { url: cv.header.linkedin_url });
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RESUMEN EJECUTIVO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(cv.summary, usable);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  // Skill Grid
  if (cv.skill_grid.length > 0) {
    checkPage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("COMPETENCIAS CLAVE", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const colW = usable / 3;
    for (let i = 0; i < cv.skill_grid.length; i += 3) {
      const row = cv.skill_grid.slice(i, i + 3);
      // Cell background
      for (let j = 0; j < row.length; j++) {
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(margin + j * colW + 1, y - 3.5, colW - 2, 7, 1, 1, "F");
        doc.text(row[j], margin + j * colW + colW / 2, y, { align: "center" });
      }
      y += 9;
    }
    y += 4;
  }

  // Experience
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EXPERIENCIA PROFESIONAL", margin, y);
  y += 7;

  for (const job of cv.work_experience) {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${job.role} — ${job.company}`, margin, y);
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(job.period, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    for (const a of job.achievements) {
      checkPage(10);
      const bulletLines = doc.splitTextToSize(`• ${toSafeString(a)}`, usable - 5);
      doc.text(bulletLines, margin + 3, y);
      y += bulletLines.length * 4.5 + 1;
    }
    y += 4;
  }

  // Education
  if (cv.education.length > 0) {
    checkPage(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EDUCACIÓN", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    for (const ed of cv.education) {
      checkPage(8);
      const edLines = doc.splitTextToSize(`• ${toSafeString(ed)}`, usable);
      doc.text(edLines, margin, y);
      y += edLines.length * 4.5 + 1;
    }
    y += 4;
  }

  // Certifications
  if (cv.certifications.length > 0) {
    checkPage(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CERTIFICACIONES", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    for (const c of cv.certifications) {
      checkPage(8);
      const cLines = doc.splitTextToSize(`• ${c}`, usable);
      doc.text(cLines, margin, y);
      y += cLines.length * 4.5 + 1;
    }
  }

  doc.save("CV-Harvard-Optimizado.pdf");
}

const OptimizedCvPreview = ({ cv }: OptimizedCvPreviewProps) => {
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  console.log("[OptimizedCvPreview] Renderizando CV:", {
    name: cv?.header?.full_name,
    skills: cv?.skill_grid?.length,
    jobs: cv?.work_experience?.length,
  });

  if (!cv || !cv.header || !cv.work_experience) {
    return (
      <div className="mx-auto max-w-5xl mt-8 p-8 text-center">
        <p className="text-destructive font-medium">No se pudo cargar el CV optimizado. Intenta de nuevo.</p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(cv));
      setCopied(true);
      toast({ title: "Copiado", description: "El CV se copió al portapapeles." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[OptimizedCvPreview] Error al copiar:", err);
      toast({ title: "Error", description: "No se pudo copiar al portapapeles.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    setPdfError(null);
    try {
      console.log("[OptimizedCvPreview] Generando PDF...");
      generatePdf(cv);
      console.log("[OptimizedCvPreview] PDF generado exitosamente");
      toast({ title: "Descargado", description: "Tu CV se descargó como PDF." });
    } catch (err) {
      console.error("[OptimizedCvPreview] Error al generar PDF:", err);
      setPdfError("Hubo un error al generar el PDF, por favor intenta de nuevo.");
      toast({ title: "Error", description: "Hubo un error al generar el PDF, por favor intenta de nuevo.", variant: "destructive" });
    }
  };

  const h = cv.header;

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
              Descargar PDF
            </Button>
          </div>
          {pdfError && (
            <p className="text-xs text-destructive mt-2">{pdfError}</p>
          )}
        </div>

        {/* CV Preview */}
        <div className="rounded-xl bg-white border border-input/50 p-8 max-h-[700px] overflow-y-auto shadow-inner" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          {/* Header */}
          <h2 className="text-xl font-bold text-center text-foreground tracking-wide">{h.full_name.toUpperCase()}</h2>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {[h.location, h.phone, h.email].filter(Boolean).join("  •  ")}
          </p>
          {h.linkedin_url && (
            <p className="text-center mt-1">
              <a href={h.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {h.linkedin_url}
              </a>
            </p>
          )}
          <hr className="my-4 border-muted" />

          {/* Summary */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Resumen Ejecutivo</h3>
          <p className="text-sm text-foreground leading-relaxed">{cv.summary}</p>

          {/* Skill Grid 4x3 */}
          {Array.isArray(cv.skill_grid) && cv.skill_grid.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Competencias Clave</h3>
              <div className="grid grid-cols-3 gap-2">
                {cv.skill_grid.map((skill, i) => (
                  <div key={i} className="rounded-lg bg-secondary/70 px-3 py-2 text-center text-xs font-medium text-foreground">
                    {toSafeString(skill)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Experiencia Profesional</h3>
            {cv.work_experience.map((job, i) => (
              <div key={i} className="mb-4">
                <p className="text-sm font-semibold text-foreground">{job.role} — {job.company}</p>
                <p className="text-xs text-muted-foreground italic">{job.period}</p>
                <ul className="mt-1.5 space-y-1">
                  {job.achievements.map((a, j) => (
                    <li key={j} className="text-sm text-foreground leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                      {toSafeString(a)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Education */}
          {Array.isArray(cv.education) && cv.education.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Educación</h3>
              <ul className="space-y-1">
                {cv.education.map((ed, i) => (
                  <li key={i} className="text-sm text-foreground">• {toSafeString(ed)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Certifications */}
          {Array.isArray(cv.certifications) && cv.certifications.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Certificaciones</h3>
              <ul className="space-y-1">
                {cv.certifications.map((c, i) => (
                  <li key={i} className="text-sm text-foreground">• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedCvPreview;
