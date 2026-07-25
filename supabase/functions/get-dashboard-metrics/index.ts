import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JSON_RESPONSE_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

interface SessionRow {
  id: string;
  created_at: string;
  recruiter_email: string | null;
  position: string;
  candidate_name: string | null;
  initial_score: number;
  updated_score: number | null;
  harvard_generated: boolean;
}

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

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parsePeriod(period: string, startDate?: string, endDate?: string): { from: string; to: string } {
  const now = new Date();
  const today = toDateInputValue(now);

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toDateInputValue(d), to: today };
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDateInputValue(d), to: today };
    }
    case "custom": {
      if (startDate && endDate) return { from: startDate, to: endDate };
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toDateInputValue(d), to: today };
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toDateInputValue(d), to: today };
    }
  }
}

function sanitizePosition(position: string): string {
  return position.trim().slice(0, 120);
}

function recruiterName(email: string | null): string {
  if (!email) return "Sin asignar";
  const local = email.split("@")[0];
  return local
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: JSON_RESPONSE_HEADERS,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Configuración del servidor incompleta" }), {
      status: 500,
      headers: JSON_RESPONSE_HEADERS,
    });
  }

  let period = "month";
  let startDate: string | undefined;
  let endDate: string | undefined;

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      period = url.searchParams.get("period") || "month";
      startDate = url.searchParams.get("startDate") || undefined;
      endDate = url.searchParams.get("endDate") || undefined;
    } else {
      const body = await req.json();
      if (body && typeof body === "object") {
        period = (body as Record<string, unknown>).period as string || "month";
        startDate = (body as Record<string, unknown>).startDate as string || undefined;
        endDate = (body as Record<string, unknown>).endDate as string || undefined;
      }
    }
  } catch {
    period = "month";
  }

  const { from, to } = parsePeriod(period, startDate, endDate);
  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  const queryUrl = new URL(`${supabaseUrl}/rest/v1/analysis_sessions`);
  queryUrl.searchParams.set("select", "*");
  queryUrl.searchParams.set("created_at", `gte.${fromTs}`);
  queryUrl.searchParams.set("created_at", `lte.${toTs}`);
  queryUrl.searchParams.set("order", "created_at.desc");
  queryUrl.searchParams.set("limit", "10000");

  const res = await fetch(queryUrl.toString(), {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(error no legible)");
    return new Response(
      JSON.stringify({ error: "No se pudo consultar las métricas", details: text }),
      { status: 502, headers: JSON_RESPONSE_HEADERS },
    );
  }

  const rows = (await res.json()) as SessionRow[];

  const total = rows.length;
  if (total === 0) {
    const empty: DashboardMetrics = {
      total_profiles: 0,
      average_match_score: 0,
      average_improvement: 0,
      low_alignment_rate: 0,
      harvard_conversion_rate: 0,
      by_recruiter: [],
      by_position: [],
      by_day: [],
      recent_profiles: [],
      score_distribution: { high: 0, medium: 0, low: 0 },
    };
    return new Response(JSON.stringify(empty), { status: 200, headers: JSON_RESPONSE_HEADERS });
  }

  const scores = rows.map((r) => (r.updated_score !== null ? r.updated_score : r.initial_score));
  const avgScore = round1(scores.reduce((a, b) => a + b, 0) / total);

  const improvements = rows
    .filter((r) => r.updated_score !== null)
    .map((r) => (r.updated_score as number) - r.initial_score);
  const avgImprovement = improvements.length > 0
    ? round1(improvements.reduce((a, b) => a + b, 0) / improvements.length)
    : 0;

  const lowAlignment = rows.filter((r) => {
    const score = r.updated_score !== null ? r.updated_score : r.initial_score;
    return score < 60;
  }).length;
  const lowAlignmentRate = round1((lowAlignment / total) * 100);

  const harvardGenerated = rows.filter((r) => r.harvard_generated).length;
  const harvardRate = round1((harvardGenerated / total) * 100);

  const scoreDistribution = {
    high: rows.filter((r) => (r.updated_score !== null ? r.updated_score : r.initial_score) >= 80).length,
    medium: rows.filter((r) => {
      const score = r.updated_score !== null ? r.updated_score : r.initial_score;
      return score >= 60 && score < 80;
    }).length,
    low: rows.filter((r) => (r.updated_score !== null ? r.updated_score : r.initial_score) < 60).length,
  };

  const recruiterMap = new Map<string, { cvs: number; totalScore: number }>();
  const positionMap = new Map<string, { analyzed: number; totalScore: number }>();
  const dayMap = new Map<string, { evaluations: number; totalScore: number }>();

  for (const row of rows) {
    const score = row.updated_score !== null ? row.updated_score : row.initial_score;
    const rec = recruiterName(row.recruiter_email);
    const pos = sanitizePosition(row.position);
    const day = row.created_at.split("T")[0];

    const recStats = recruiterMap.get(rec) ?? { cvs: 0, totalScore: 0 };
    recStats.cvs += 1;
    recStats.totalScore += score;
    recruiterMap.set(rec, recStats);

    const posStats = positionMap.get(pos) ?? { analyzed: 0, totalScore: 0 };
    posStats.analyzed += 1;
    posStats.totalScore += score;
    positionMap.set(pos, posStats);

    const dayStats = dayMap.get(day) ?? { evaluations: 0, totalScore: 0 };
    dayStats.evaluations += 1;
    dayStats.totalScore += score;
    dayMap.set(day, dayStats);
  }

  const byRecruiter = Array.from(recruiterMap.entries())
    .map(([name, stats]) => ({
      name,
      cvs: stats.cvs,
      avg_score: round1(stats.totalScore / stats.cvs),
    }))
    .sort((a, b) => b.cvs - a.cvs);

  const byPosition = Array.from(positionMap.entries())
    .map(([role, stats]) => ({
      role,
      analyzed: stats.analyzed,
      avg_score: round1(stats.totalScore / stats.analyzed),
      status: "Activa",
    }))
    .sort((a, b) => b.analyzed - a.analyzed)
    .slice(0, 10);

  const dayRange: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dayRange.push(toDateInputValue(new Date(d)));
  }

  const byDay = dayRange.map((date) => {
    const stats = dayMap.get(date);
    return {
      date,
      evaluations: stats?.evaluations ?? 0,
      avg_score: stats ? round1(stats.totalScore / stats.evaluations) : 0,
    };
  });

  const recentProfiles = rows.slice(0, 20).map((r) => ({
    id: r.id,
    candidate_name: r.candidate_name,
    position: sanitizePosition(r.position),
    recruiter_email: r.recruiter_email,
    initial_score: r.initial_score,
    updated_score: r.updated_score,
    harvard_generated: r.harvard_generated,
    created_at: r.created_at,
  }));

  const metrics: DashboardMetrics = {
    total_profiles: total,
    average_match_score: avgScore,
    average_improvement: avgImprovement,
    low_alignment_rate: lowAlignmentRate,
    harvard_conversion_rate: harvardRate,
    by_recruiter: byRecruiter,
    by_position: byPosition,
    by_day: byDay,
    recent_profiles: recentProfiles,
    score_distribution: scoreDistribution,
  };

  return new Response(JSON.stringify(metrics), { status: 200, headers: JSON_RESPONSE_HEADERS });
});
