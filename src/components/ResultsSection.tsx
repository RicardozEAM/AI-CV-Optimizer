import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CVAnalysisResult } from "@/lib/types";

interface ResultsSectionProps {
  result: CVAnalysisResult | null;
}

const ResultsSection = ({ result }: ResultsSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (result) setVisible(true);
  }, [result]);

  const CIRCUMFERENCE = 283;

  const isPlaceholder = !result;
  const score = result?.analysis.match_score ?? 0;
  const offset = isPlaceholder ? CIRCUMFERENCE : CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  const scoreColor = score >= 75 ? "hsl(var(--success))" : score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const scoreLabel = score >= 75 ? "Competitivo" : score >= 50 ? "Necesita mejoras" : "Necesita mejoras significativas";

  const missingKeywords = result?.analysis.keywords_missing ?? [
    { term: "SAP", weight: "critical" as const, vacancy_frequency: 3 },
    { term: "Gestión de proyectos", weight: "critical" as const, vacancy_frequency: 2 },
    { term: "Scrum", weight: "medium" as const, vacancy_frequency: 1 },
  ];

  const structureAlerts = result?.analysis.structure_alerts ?? [
    { type: "warning" as const, message: "Formato no óptimo para ATS", fix: "" },
    { type: "error" as const, message: "Falta sección de logros cuantificables", fix: "" },
    { type: "info" as const, message: "Información de contacto completa", fix: "" },
  ];

  const alertIcon = {
    error: <XCircle className="h-4 w-4 text-destructive" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    info: <Info className="h-4 w-4 text-success" />,
  };

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-secondary/40">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            {isPlaceholder ? "Resultado del análisis" : "Tu diagnóstico ATS"}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-pretty">
            {isPlaceholder ? "Así se verá tu diagnóstico tras analizar tu CV" : "Análisis completado"}
          </p>
          {isPlaceholder && (
            <p className="mt-1 text-xs text-muted-foreground/60 italic">Vista previa con datos de ejemplo</p>
          )}
        </div>

        <div className="mx-auto max-w-5xl grid gap-5 md:grid-cols-3">
          {/* Score Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm text-center transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } ${isPlaceholder ? "opacity-60" : ""}`}
            style={{ transitionDelay: "200ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">Match Score</h3>
            <div className="relative mx-auto w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={visible ? offset : CIRCUMFERENCE}
                  className="transition-all duration-[1.2s] ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isPlaceholder ? (
                  <span className="text-3xl font-black text-muted-foreground/40">--</span>
                ) : (
                  <span className="text-4xl font-black text-foreground">{score}%</span>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{scoreLabel}</p>

            {result?.analysis.scoring_details && (
              <div className="mt-5 space-y-2 text-left">
                <ScoreBar label="Keywords" value={result.analysis.scoring_details.keywords} max={30} />
                <ScoreBar label="Experiencia" value={result.analysis.scoring_details.experience} max={40} />
                <ScoreBar label="Estructura" value={result.analysis.scoring_details.structure} max={30} />
              </div>
            )}
          </div>

          {/* Keywords Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } ${isPlaceholder ? "opacity-60" : ""}`}
            style={{ transitionDelay: "350ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-wider">Keywords Faltantes</h3>
            <div className="space-y-2.5">
              {missingKeywords.slice(0, 6).map((kw) => (
                <div key={kw.term} className="flex items-center gap-3 rounded-lg bg-secondary/80 px-3 py-2.5">
                  {kw.weight === "critical" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  )}
                  <span className="text-sm text-foreground font-medium">{kw.term}</span>
                  {kw.weight === "critical" && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-destructive">Crítica</span>
                  )}
                </div>
              ))}
            </div>

            {result?.analysis.keywords_detected && result.analysis.keywords_detected.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Detectadas ✓</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllKeywords
                    ? result.analysis.keywords_detected
                    : result.analysis.keywords_detected.slice(0, 8)
                  ).map((kw) => (
                    <span key={kw.term} className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                      {kw.term}
                    </span>
                  ))}
                </div>
                {result.analysis.keywords_detected.length > 8 && (
                  <button
                    onClick={() => setShowAllKeywords((v) => !v)}
                    className="mt-2 text-[11px] text-primary hover:underline"
                  >
                    {showAllKeywords
                      ? "Ver menos"
                      : `Ver ${result.analysis.keywords_detected.length - 8} más`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Alerts Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } ${isPlaceholder ? "opacity-60" : ""}`}
            style={{ transitionDelay: "500ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-wider">Alertas de Estructura</h3>
            <div className="space-y-2.5">
              {structureAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/80 px-3 py-2.5">
                  <span className="mt-0.5 shrink-0">{alertIcon[alert.type]}</span>
                  <div className="min-w-0">
                    <span className="text-sm text-foreground block">{alert.message}</span>
                    {alert.fix && (
                      <span className="text-xs text-muted-foreground mt-0.5 block">💡 {alert.fix}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default ResultsSection;
