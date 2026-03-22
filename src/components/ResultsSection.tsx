import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SCORE = 45;
const CIRCUMFERENCE = 283;
const OFFSET = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;

const missingKeywords = [
  { keyword: "SAP", critical: true },
  { keyword: "Gestión de proyectos", critical: true },
  { keyword: "Scrum", critical: false },
  { keyword: "Power BI", critical: true },
  { keyword: "KPI", critical: false },
];

const structureAlerts = [
  { text: "Formato no óptimo para ATS", severity: "warning" as const },
  { text: "Falta sección de logros cuantificables", severity: "error" as const },
  { text: "Información de contacto completa", severity: "success" as const },
  { text: "Extensión adecuada (1 página)", severity: "success" as const },
];

const ResultsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const severityIcon = {
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
    success: <CheckCircle className="h-4 w-4 text-success" />,
  };

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-secondary/40">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Resultado del análisis
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-pretty">
            Así se verá tu diagnóstico tras analizar tu CV
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-5 md:grid-cols-3">
          {/* Score Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm text-center transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">Match Score</h3>
            <div className="relative mx-auto w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={visible ? OFFSET : CIRCUMFERENCE}
                  className="transition-all duration-[1.2s] ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-foreground">{SCORE}%</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Necesita mejoras significativas</p>
          </div>

          {/* Keywords Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "350ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-wider">Keywords Faltantes</h3>
            <div className="space-y-2.5">
              {missingKeywords.map((kw) => (
                <div key={kw.keyword} className="flex items-center gap-3 rounded-lg bg-secondary/80 px-3 py-2.5">
                  {kw.critical ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  )}
                  <span className="text-sm text-foreground font-medium">{kw.keyword}</span>
                  {kw.critical && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-destructive">Crítica</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Card */}
          <div
            className={`glass-card rounded-2xl p-8 shadow-sm transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-wider">Alertas de Estructura</h3>
            <div className="space-y-2.5">
              {structureAlerts.map((alert) => (
                <div key={alert.text} className="flex items-start gap-3 rounded-lg bg-secondary/80 px-3 py-2.5">
                  <span className="mt-0.5 shrink-0">{severityIcon[alert.severity]}</span>
                  <span className="text-sm text-foreground">{alert.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
