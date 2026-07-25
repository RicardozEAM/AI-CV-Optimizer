import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  FileCheck,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardMetrics {
  total_profiles: number;
  average_match_score: number;
  average_improvement: number;
  low_alignment_rate: number;
  harvard_conversion_rate: number;
  by_recruiter: Array<{ name: string; cvs: number; avg_score: number }>;
  by_position: Array<{ role: string; analyzed: number; avg_score: number; status: string }>;
  by_day: Array<{ date: string; evaluations: number; avg_score: number }>;
  recent_profiles: Array<{
    id: string;
    candidate_name: string | null;
    position: string;
    recruiter_email: string | null;
    initial_score: number;
    updated_score: number | null;
    harvard_generated: boolean;
    created_at: string;
  }>;
  score_distribution: {
    high: number;
    medium: number;
    low: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

function recruiterName(email: string | null): string {
  if (!email) return "Sin asignar";
  const local = email.split("@")[0];
  return local
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const SCORE_COLORS = {
  high: "#10b981", // emerald-500
  medium: "#f59e0b", // amber-500
  low: "#ef4444", // red-500
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "custom">("month");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { period };
      if (period === "custom" && customRange.start && customRange.end) {
        params.startDate = customRange.start;
        params.endDate = customRange.end;
      }
      const { data, error: fnError } = await supabase.functions.invoke("get-dashboard-metrics", {
        body: params,
      });
      if (fnError) throw fnError;
      setMetrics(data as DashboardMetrics);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar las métricas";
      setError(msg);
      toast({ title: "Error de dashboard", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customRange.start, customRange.end]);

  const kpiCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: "Perfiles evaluados",
        value: metrics.total_profiles.toString(),
        icon: Users,
        tone: "neutral",
      },
      {
        label: "Match promedio",
        value: `${metrics.average_match_score}%`,
        icon: Target,
        tone: metrics.average_match_score >= 75 ? "positive" : metrics.average_match_score >= 60 ? "warning" : "negative",
      },
      {
        label: "Mejora promedio post-phone screen",
        value: `${metrics.average_improvement >= 0 ? "+" : ""}${metrics.average_improvement} pts`,
        icon: metrics.average_improvement >= 0 ? TrendingUp : TrendingDown,
        tone: metrics.average_improvement > 0 ? "positive" : metrics.average_improvement < 0 ? "negative" : "neutral",
      },
      {
        label: "Conversión a CV Harvard",
        value: `${metrics.harvard_conversion_rate}%`,
        icon: FileCheck,
        tone: metrics.harvard_conversion_rate >= 50 ? "positive" : "neutral",
      },
    ];
  }, [metrics]);

  const distributionData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Alto (>=80%)", value: metrics.score_distribution.high, key: "high" },
      { name: "Medio (60-79%)", value: metrics.score_distribution.medium, key: "medium" },
      { name: "Bajo (<60%)", value: metrics.score_distribution.low, key: "low" },
    ];
  }, [metrics]);

  const handleExport = () => {
    if (!metrics) return;
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
      kpiCards.forEach((k) => {
        doc.text(`- ${k.label}: ${k.value}`, 22, y);
        y += 6;
      });
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CVs procesados por reclutador", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      metrics.by_recruiter.forEach((r) => {
        doc.text(`- ${r.name}: ${r.cvs} CVs · match prom. ${r.avg_score}%`, 22, y);
        y += 6;
      });
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Top vacantes analizadas", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      metrics.by_position.forEach((p) => {
        doc.text(
          `- ${p.role} — ${p.analyzed} CVs · score prom. ${p.avg_score}% · ${p.status}`,
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

  const periodLabel = {
    today: "Hoy",
    week: "Últimos 7 días",
    month: "Mes en curso",
    custom: "Personalizado",
  }[period];

  return (
    <section ref={dashboardRef} className="relative py-12 md:py-16 bg-slate-50">
      <div className="container">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Reporte interno
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Dashboard de Impacto
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-xl">
              Métricas operativas y de calidad del equipo de Talent Acquisition. Período: {periodLabel}.
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={!metrics || loading}
            className="gap-2 h-11 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar reporte (PDF)
          </Button>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {(["today", "week", "month", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={classNames(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                period === p
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700",
              )}
            >
              {periodLabel === p ? p === "custom" ? "Personalizado" : periodLabel : p === "today" ? "Hoy" : p === "week" ? "7 días" : p === "month" ? "Mes" : "Personalizado"}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
              />
            </div>
          )}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">No se pudieron cargar los datos</p>
              <p className="text-red-700">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMetrics}
              className="ml-auto border-red-300 text-red-800 hover:bg-red-100"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            const positive = kpi.tone === "positive";
            const negative = kpi.tone === "negative";
            const warning = kpi.tone === "warning";
            return (
              <div
                key={kpi.label}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div
                    className={classNames(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                      positive && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      warning && "bg-amber-50 text-amber-700 border-amber-200",
                      negative && "bg-red-50 text-red-700 border-red-200",
                      !positive && !warning && !negative && "bg-slate-50 text-slate-600 border-slate-200",
                    )}
                  >
                    {positive ? <ArrowUpRight className="h-3 w-3" /> : negative ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {positive ? "Alto" : negative ? "Atención" : warning ? "Medio" : "Estable"}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {kpi.label}
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900 tabular-nums">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main charts row */}
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          {/* Evolution line chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Evolución de evaluaciones</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Volumen y match promedio por día
                </p>
              </div>
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                Total: {metrics?.total_profiles ?? 0} perfiles
              </span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={metrics?.by_day ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDateLabel}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                    labelFormatter={(label) => formatDateLabel(label as string)}
                  />
                  <Line
                    type="monotone"
                    dataKey="evaluations"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#4f46e5" }}
                    name="Evaluaciones"
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                    name="Match promedio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score distribution */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Distribución de calidad</h3>
            <p className="text-xs text-slate-500 mb-5">Perfiles por rango de match</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {distributionData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={SCORE_COLORS[entry.key as keyof typeof SCORE_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {distributionData.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: SCORE_COLORS[entry.key as keyof typeof SCORE_COLORS] }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-semibold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recruiters + positions row */}
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          {/* Recruiter volume */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">CVs por reclutador</h3>
                <p className="text-xs text-slate-500 mt-0.5">Volumen y calidad promedio</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics?.by_recruiter ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Bar dataKey="cvs" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking side */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Ranking del equipo</h3>
            <p className="text-xs text-slate-500 mb-5">Volumen procesado en el período</p>
            <ul className="space-y-3">
              {(metrics?.by_recruiter ?? [])
                .sort((a, b) => b.cvs - a.cvs)
                .map((r, i, arr) => {
                  const max = Math.max(...arr.map((x) => x.cvs));
                  const pct = max > 0 ? Math.round((r.cvs / max) * 100) : 0;
                  return (
                    <li key={r.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2 text-slate-800">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {i + 1}
                          </span>
                          {r.name}
                        </span>
                        <span className="tabular-nums text-slate-500">{r.cvs} CVs · {r.avg_score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        {/* Positions table */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top vacantes analizadas</h3>
              <p className="text-xs text-slate-500">Posiciones con mayor volumen procesado</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="text-left font-semibold py-3 pr-4">Posición</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">CVs analizados</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">Match prom.</th>
                  <th className="text-right font-semibold py-3 pl-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.by_position ?? []).map((p) => (
                  <tr
                    key={p.role}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="inline-block whitespace-nowrap font-medium text-slate-900">
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-900">
                      {p.analyzed}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span
                        className={classNames(
                          "font-semibold",
                          p.avg_score >= 75 && "text-emerald-600",
                          p.avg_score >= 60 && p.avg_score < 75 && "text-amber-600",
                          p.avg_score < 60 && "text-red-600",
                        )}
                      >
                        {p.avg_score}%
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span
                        className={classNames(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                          p.status === "Activa"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-100 text-slate-600 border-slate-200",
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(metrics?.by_position ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                      No hay vacantes analizadas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent profiles */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Perfiles recientes</h3>
              <p className="text-xs text-slate-500">Últimas evaluaciones registradas</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="text-left font-semibold py-3 pr-4">Candidato</th>
                  <th className="text-left font-semibold py-3 px-4">Vacante</th>
                  <th className="text-left font-semibold py-3 px-4">Reclutador</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">Match inicial</th>
                  <th className="text-right font-semibold py-3 px-4 tabular-nums">Match actualizado</th>
                  <th className="text-center font-semibold py-3 pl-4">CV Harvard</th>
                  <th className="text-right font-semibold py-3 pl-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.recent_profiles ?? []).map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {profile.candidate_name ?? "Anónimo"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-block whitespace-nowrap">{profile.position}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{recruiterName(profile.recruiter_email)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-900">
                      {profile.initial_score}%
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {profile.updated_score !== null ? (
                        <span className={classNames(
                          "font-semibold",
                          profile.updated_score > profile.initial_score && "text-emerald-600",
                          profile.updated_score < profile.initial_score && "text-red-600",
                          profile.updated_score === profile.initial_score && "text-slate-900",
                        )}>
                          {profile.updated_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-center">
                      {profile.harvard_generated ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Generado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right text-slate-500 text-xs">
                      {new Date(profile.created_at).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
                {(metrics?.recent_profiles ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                      No hay perfiles registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
