import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { NewsResponse, Outcome, SectorBriefing } from "@/lib/news-types";

export const dynamic = "force-dynamic";

type StoryRow = {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string | null;
};

type BriefingRow = {
  symbol: string;
  sector: string;
  outcome: "stories" | "no_relevant_news" | null;
  headline: string;
  summary: string;
  generated_at: string;
  last_success_at: string | null;
  last_run_status: string;
  last_error: string | null;
  sector_news: StoryRow[];
};

const FAILURES = ["news_api_failed", "llm_failed", "unexpected_error"];

function toBriefing(row: BriefingRow): SectorBriefing | null {
  // Never ran: nothing to show, so the UI falls back to "no news stored"
  if (row.last_run_status === "never_run" && !row.outcome) return null;

  // Has a good stored result (possibly from an earlier run): show it
  // No good result yet and the run failed: show the failure
  const outcome = (row.outcome ?? row.last_run_status) as Outcome;
  const failed = !row.outcome && FAILURES.includes(row.last_run_status);

  return {
    symbol: row.symbol,
    sector: row.sector,
    outcome,
    headline: failed ? "" : row.headline,
    summary: failed ? "The latest update for this sector failed. Please try again later." : row.summary,
    generatedAt: row.last_success_at ?? row.generated_at,
    stories: (row.sector_news ?? []).map((s) => ({
      title: s.title,
      summary: s.summary,
      url: s.url,
      source: s.source,
      publishedAt: s.published_at ?? row.generated_at,
    })),
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? null;

  if (symbol !== null && !/^[A-Z]{2,5}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    // One query: briefings with their stories embedded, newest stories first
    let query = getSupabaseAdmin()
      .from("sector_briefings")
      .select(
        "symbol, sector, outcome, headline, summary, generated_at, last_success_at, last_run_status, last_error, sector_news(title, summary, url, source, published_at)"
      )
      .order("symbol")
      .order("published_at", { referencedTable: "sector_news", ascending: false });

    if (symbol) query = query.eq("symbol", symbol);

    const { data, error } = await query;
    if (error) throw error;

    const briefings = ((data ?? []) as unknown as BriefingRow[])
      .map(toBriefing)
      .filter((b): b is SectorBriefing => b !== null);

    const body: NewsResponse = { briefings };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/news] failed:", err);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}
