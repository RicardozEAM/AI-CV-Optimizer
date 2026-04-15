import { AlertTriangle, XCircle, Info } from "lucide-react";
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

  const scoreColor = score >= 75
    ? "hsl(158 100% 42%)"
    : score >= 50
    ? "hsl(35 95% 55%)"
    : "hsl(0 72% 60%)";

  const scoreLabel = score >= 75 ? "Competitivo" : score >= 50 ? "Necesita mejoras" : "Necesita mejoras significativas";

  const missingKeywords = result?.analysis.keywords_missing ?? [
    { term: "Docker", weight: "critical" as const, vacancy_frequency: 3 },
    { term: "CI/CD", weight: "critical" as const, vacancy_frequency: 2 },
    { term: "Kubernetes", weight: "medium" as const, vacancy_frequency: 1 },
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
    <section ref={sectionRef} className="relative py-20 md:py-28 bg-background overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="container relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {isPlaceholder ? "Vista previa" : "Análisis completado"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            {isPlaceholder ? "Resultado del análisis" : "Tu diagnóstico ATS"}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-pretty">
            {isPlaceholder ? "Así se verá tu diagnóstico tras analizar tu CV" : "Hemos analizado tu CV contra la vacante"}
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-3">
          {/* Score Card */}
          <ScoreCard
            visible={visible}
            isPlaceholder={isPlaceholder}
            score={score}
            scoreColor={scoreColor}
            scoreLabel={scoreLabel}
            offset={offset}
            circumference={CIRCUMFERENCE}
            scoringDetails={result?.analysis.scoring_details}
          />

          {/* Keywords Card */}
          <KeywordsCard
            visible={visible}
            isPlaceholder={isPlaceholder}
            missingKeywords={missingKeywords}
            detectedKeywords={result?.analysis.keywords_detected}
            showAll={showAllKeywords}
            onToggleShowAll={() => setShowAllKeywords((v) => !v)}
          />

          {/* Alerts Card */}
          <AlertsCard
            visible={visible}
            isPlaceholder={isPlaceholder}
            alerts={structureAlerts}
            alertIcon={alertIcon}
          />
        </div>
      </div>
    </section>
  );
};

/* ── Sub-components ── */

function ScoreCard({ visible, isPlaceholder, score, scoreColor, scoreLabel, offset, circumference, scoringDetails }: {
  visible: boolean; isPlaceholder: boolean; score: number; scoreColor: string; scoreLabel: string;
  offset: number; circumference: number;
  scoringDetails?: { keywords: number; experience: number; structure: number } | null;
}) {
  return (
    <div
      className={`card-lift rounded-2xl p-8 text-center transition-all duration-700 border border-border/60 bg-card ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${isPlaceholder ? "opacity-50" : ""}`}
      style={{ transitionDelay: "200ms" }}
    >
      <h3 className="text-xs font-semibold text-primary mb-6 uppercase tracking-widest">Match Score</h3>
      <div className="relative mx-auto w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={isPlaceholder ? "hsl(var(--border))" : scoreColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={visible ? offset : circumference}
            className="transition-all duration-[1.2s] ease-out"
            style={!isPlaceholder && score >= 75 ? { filter: "drop-shadow(0 0 6px hsl(158 100% 42% / 0.5))" } : {}}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPlaceholder ? (
            <span className="text-3xl font-black text-border">--</span>
          ) : (
            <span className="text-4xl font-black" style={{ color: scoreColor }}>{score}%</span>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {isPlaceholder ? "Sin analizar" : scoreLabel}
      </p>

      {scoringDetails && (
        <div className="mt-6 space-y-2.5 text-left">
          <ScoreBar label="Keywords" value={scoringDetails.keywords} max={30} color="hsl(158 100% 42%)" />
          <ScoreBar label="Experiencia" value={scoringDetails.experience} max={40} color={scoringDetails.experience >= 30 ? "hsl(158 100% 42%)" : "hsl(35 95% 55%)"} />
          <ScoreBar label="Estructura" value={scoringDetails.structure} max={30} color="hsl(158 100% 42%)" />
        </div>
      )}
    </div>
  );
}

function KeywordsCard({ visible, isPlaceholder, missingKeywords, detectedKeywords, showAll, onToggleShowAll }: {
  visible: boolean; isPlaceholder: boolean;
  missingKeywords: { term: string; weight: string; vacancy_frequency: number }[];
  detectedKeywords?: { term: string; in_cv: boolean }[] | null;
  showAll: boolean; onToggleShowAll: () => void;
}) {
  return (
    <div
      className={`card-lift rounded-2xl p-8 transition-all duration-700 border border-border/60 bg-card ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${isPlaceholder ? "opacity-50" : ""}`}
      style={{ transitionDelay: "350ms" }}
    >
      <h3 className="text-xs font-semibold text-primary mb-5 uppercase tracking-widest">Keywords Faltantes</h3>
      <div className="space-y-2">
        {missingKeywords.slice(0, 6).map((kw) => (
          <div key={kw.term} className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/50 px-3 py-2.5 transition-colors hover:border-border/70">
            <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${kw.weight === "critical" ? "text-destructive" : "text-warning"}`} />
            <span className="text-sm text-foreground font-medium flex-1">{kw.term}</span>
            {kw.weight === "critical" && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Crítica</span>
            )}
          </div>
        ))}
      </div>

      {detectedKeywords && detectedKeywords.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border/40">
          <h4 className="text-xs font-semibold text-primary/70 mb-2.5 uppercase tracking-widest">Detectadas ✓</h4>
          <div className="flex flex-wrap gap-1.5">
            {(showAll ? detectedKeywords : detectedKeywords.slice(0, 8)).map((kw) => (
              <span key={kw.term} className="inline-flex items-center rounded-md border border-primary/20 bg-primary/8 px-2 py-1 text-xs font-medium text-primary">
                {kw.term}
              </span>
            ))}
          </div>
          {detectedKeywords.length > 8 && (
            <button onClick={onToggleShowAll} className="mt-2 text-[11px] text-primary hover:underline">
              {showAll ? "Ver menos" : `Ver ${detectedKeywords.length - 8} más`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AlertsCard({ visible, isPlaceholder, alerts, alertIcon }: {
  visible: boolean; isPlaceholder: boolean;
  alerts: { type: "error" | "warning" | "info"; message: string; fix: string }[];
  alertIcon: Record<string, React.ReactNode>;
}) {
  return (
    <div
      className={`card-lift rounded-2xl p-8 transition-all duration-700 border border-border/60 bg-card ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${isPlaceholder ? "opacity-50" : ""}`}
      style={{ transitionDelay: "500ms" }}
    >
      <h3 className="text-xs font-semibold text-primary mb-5 uppercase tracking-widest">Alertas de Estructura</h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/50 px-3 py-2.5">
            <span className="mt-0.5 shrink-0">{alertIcon[alert.type]}</span>
            <div className="min-w-0">
              <span className="text-sm text-foreground block leading-snug">{alert.message}</span>
              {alert.fix && (
                <span className="text-xs text-primary/60 mt-1 block">💡 {alert.fix}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default ResultsSection;