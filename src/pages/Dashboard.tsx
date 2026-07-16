import { useRef } from "react";
import { Download, TrendingUp, Clock, Wallet, Target, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Mock data (uso interno / demo gerencial) ────────────────────────────────

const kpis = [
  {
    label: "Horas operativas ahorradas",
    value: "128 h",
    delta: "+22% vs. mes anterior",
    icon: Clock,
  },
  {
    label: "Ahorro estimado (ROI)",
    value: "S/ 24,600",
    delta: "+18% vs. mes anterior",
    icon: Wallet,
  },
  {
    label: "Match Score promedio",
    value: "72 %",
    delta: "+6 pts vs. mes anterior",
    icon: Target,
  },
];

const recruiterVolume = [
  { name: "Ricardo", cvs: 42 },
  { name: "Marysol", cvs: 58 },
  { name: "Angel", cvs: 31 },
  { name: "Lorena", cvs: 49 },
];

const topPositions = [
  { role: "FullStack Web Developer Senior", analyzed: 34, avgScore: 78, status: "Activa" },
  { role: "Data Engineer Semi Senior", analyzed: 22, avgScore: 71, status: "Activa" },
  { role: "DevOps Engineer Senior", analyzed: 18, avgScore: 74, status: "Activa" },
  { role: "Product Designer Senior", analyzed: 15, avgScore: 69, status: "En pausa" },
  { role: "Mobile Developer Semi Senior", analyzed: 12, avgScore: 66, status: "Activa" },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("TechScreen AI · TA Portal", pageW / 2, y, { align: "center" });
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Dashboard de Impacto — Reporte Gerencial", pageW / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Generado: ${new Date().toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}`,
        pageW / 2,
        y,
        { align: "center" },
      );
      doc.setTextColor(0);
      y += 10;

      doc.setDrawColor(200);
      doc.line(20, y, pageW - 20, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("KPIs del período", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      kpis.forEach((k) => {
        doc.text(`- ${k.label}: ${k.value}  (${k.delta})`, 22, y);
        y += 6;
      });
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CVs procesados por reclutador", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      recruiterVolume.forEach((r) => {
        doc.text(`- ${r.name}: ${r.cvs} CVs`, 22, y);
        y += 6;
      });
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Top vacantes analizadas", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      topPositions.forEach((p) => {
        doc.text(
          `- ${p.role} — ${p.analyzed} CVs · score prom. ${p.avgScore}% · ${p.status}`,
          22,
          y,
        );
        y += 6;
      });

      doc.save(`TechScreenAI-Dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "Reporte generado", description: "El PDF se descargó correctamente." });
    } catch (err) {
      console.error("[Dashboard] Export error:", err);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el reporte. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <section ref={dashboardRef} className="relative py-16 md:py-20 bg-background">
      <div className="container">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Reporte interno
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Dashboard de Impacto
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Métricas operativas y de ROI del equipo de Talent Acquisition, listas para presentar a gerencia.
            </p>
          </div>
          <Button
            onClick={handleExport}
            className="gap-2 h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Exportar reporte (PDF)
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="card-lift glass-card rounded-2xl p-6 border border-border/60"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[10px] font-semibold text-success uppercase tracking-wider">
                    <TrendingUp className="h-3 w-3" />
                    Positivo
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {kpi.label}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground tabular-nums">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.delta}</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="grid gap-4 lg:grid-cols-5 mb-10">
          <div className="lg:col-span-3 card-lift glass-card rounded-2xl p-6 border border-border/60">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  CVs procesados por reclutador
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 días</p>
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                Total: {recruiterVolume.reduce((acc, r) => acc + r.cvs, 0)} CVs
              </span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recruiterVolume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(243 75% 59%)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(243 75% 59%)" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Bar dataKey="cvs" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side summary */}
          <div className="lg:col-span-2 card-lift glass-card rounded-2xl p-6 border border-border/60">
            <h3 className="text-sm font-semibold text-foreground mb-1">Ranking del equipo</h3>
            <p className="text-xs text-muted-foreground mb-5">Volumen procesado en el período</p>
            <ul className="space-y-3">
              {[...recruiterVolume]
                .sort((a, b) => b.cvs - a.cvs)
                .map((r, i) => {
                  const max = Math.max(...recruiterVolume.map((x) => x.cvs));
                  const pct = Math.round((r.cvs / max) * 100);
                  return (
                    <li key={r.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2 text-foreground">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                            {i + 1}
                          </span>
                          {r.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{r.cvs}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        {/* Table */}
        <div className="card-lift glass-card rounded-2xl p-6 border border-border/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top vacantes analizadas</h3>
              <p className="text-xs text-muted-foreground">Posiciones con mayor volumen procesado</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border/60">
                  <th className="text-left font-semibold py-3 pr-4">Posición</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">CVs analizados</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">Match prom.</th>
                  <th className="text-right font-semibold py-3 pl-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {topPositions.map((p) => (
                  <tr
                    key={p.role}
                    className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="inline-block whitespace-nowrap font-medium text-foreground">
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-foreground">
                      {p.analyzed}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span
                        className={
                          p.avgScore >= 75
                            ? "text-success font-semibold"
                            : p.avgScore >= 60
                            ? "text-warning font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {p.avgScore}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          p.status === "Activa"
                            ? "bg-primary/10 text-primary border-primary/25"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
