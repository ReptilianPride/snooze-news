import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fetchAllSectors } from "@/lib/market/yahoo";
import { runInvestigation, type SectorResult } from "@/lib/agent/result";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds; the real cap depends on your Vercel plan, so check it

function authorised(req: NextRequest): boolean {
  const expected = process.env.INGEST_SECRET;
  const given = req.headers.get("x-ingest-secret");
  if (!expected || !given) return false;
  // hash both sides so the buffers are equal length for timingSafeEqual
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}

// NewsData gives "2026-10-09 13:21:35" (UTC, no zone marker)
function toIso(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw.replace(" ", "T") + "Z";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function saveResult(r: SectorResult): Promise<{ inserted: number; updated: number }> {
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

  // Success (with stories, or genuinely none): replace the briefing
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

  // Remove stored stories that are not in the new result
  const keep = new Set(rows.map((x) => x.url));
  const stale = [...existingUrls].filter((u) => !keep.has(u));
  if (stale.length > 0) {
    const { error } = await db.from("sector_news").delete().eq("symbol", r.symbol).in("url", stale);
    if (error) throw error;
  }

  const updated = rows.filter((x) => existingUrls.has(x.url)).length;
  return { inserted: rows.length - updated, updated };
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const only = req.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? null;
  if (only !== null && !/^[A-Z]{2,5}$/.test(only)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: run } = await db.from("ingestion_runs").insert({}).select("id").single();

  const sectors = (await fetchAllSectors()).filter((s) => !only || s.symbol === only);
  if (sectors.length === 0) return NextResponse.json({ error: "No matching sector" }, { status: 404 });

  let processed = 0, inserted = 0, updated = 0;
  const failedSectors: { symbol: string; reason: string }[] = [];

  for (const s of sectors) {
    if (s.error || !s.anomaly || typeof s.changePercent !== "number") {
      failedSectors.push({ symbol: s.symbol, reason: s.error ?? "missing market data" });
      continue;
    }
    try {
      const result = await runInvestigation({
        symbol: s.symbol,
        sector: s.name,
        zScore: s.anomaly.zScore,
        changePercent: s.changePercent,
      });
      const counts = await saveResult(result);
      inserted += counts.inserted;
      updated += counts.updated;
      processed++;
      if (result.outcome !== "stories" && result.outcome !== "no_relevant_news") {
        failedSectors.push({ symbol: s.symbol, reason: result.outcome });
      }
    } catch (err) {
      console.error(`[ingest] ${s.symbol} failed:`, err);
      failedSectors.push({ symbol: s.symbol, reason: err instanceof Error ? err.message : "save failed" });
    }
    await new Promise((r) => setTimeout(r, 1500)); // stay inside NewsData rate limits
  }

  if (run?.id) {
    await db.from("ingestion_runs").update({
      finished_at: new Date().toISOString(),
      sectors_processed: processed,
      articles_inserted: inserted,
      articles_updated: updated,
      failed_sectors: failedSectors,
    }).eq("id", run.id);
  }

  return NextResponse.json({
    status: failedSectors.length === 0 ? "completed" : "completed_with_failures",
    sectorsProcessed: processed,
    articlesInserted: inserted,
    articlesUpdated: updated,
    failedSectors,
  });
}