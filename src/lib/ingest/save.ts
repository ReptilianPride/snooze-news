import { getSupabaseAdmin } from "../supabase/server";
import type { SectorResult } from "../agent/result";

// NewsData gives "2026-10-09 13:21:35" (UTC, no zone marker)
function toIso(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw.replace(" ", "T") + "Z";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveResult(r: SectorResult): Promise<{ inserted: number; updated: number }> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const failed = r.outcome !== "stories" && r.outcome !== "no_relevant_news";

  // Failure: update only the status columns, keep the old briefing and stories
  if (failed) {
    const { error } = await db.from("sector_briefings").upsert(
      { symbol: r.symbol, sector: r.sector, last_run_status: r.outcome, last_error: r.message },
      { onConflict: "symbol" }
    );
    if (error) throw error;
    return { inserted: 0, updated: 0 };
  }

  const { error: bErr } = await db.from("sector_briefings").upsert(
    {
      symbol: r.symbol,
      sector: r.sector,
      outcome: r.outcome,
      headline: r.headline,
      summary: r.summary,
      generated_at: now,
      last_success_at: now,
      last_run_status: r.outcome,
      last_error: null,
    },
    { onConflict: "symbol" }
  );
  if (bErr) throw bErr;

  const { data: existing, error: eErr } = await db.from("sector_news").select("url").eq("symbol", r.symbol);
  if (eErr) throw eErr;
  const existingUrls = new Set((existing ?? []).map((x: any) => x.url as string));

  const rows = r.stories.map((s) => ({
    symbol: r.symbol,
    title: s.title,
    summary: s.summary,
    url: s.url,
    source: s.source,
    published_at: toIso(s.publishedAt),
  }));

  if (rows.length > 0) {
    const { error } = await db.from("sector_news").upsert(rows, { onConflict: "symbol,url" });
    if (error) throw error;
  }

  const keep = new Set(rows.map((x) => x.url));
  const stale = [...existingUrls].filter((u) => !keep.has(u));
  if (stale.length > 0) {
    const { error } = await db.from("sector_news").delete().eq("symbol", r.symbol).in("url", stale);
    if (error) throw error;
  }

  const updated = rows.filter((x) => existingUrls.has(x.url)).length;
  return { inserted: rows.length - updated, updated };
}