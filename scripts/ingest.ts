import { fetchAllSectors } from "../src/lib/market/yahoo";
import { runInvestigation } from "../src/lib/agent/result";
import { saveResult } from "../src/lib/ingest/save";
import { getSupabaseAdmin } from "../src/lib/supabase/server";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const only = process.argv[2]?.toUpperCase() ?? null; // optional: npm run ingest -- XLK
  const db = getSupabaseAdmin();

  const { data: run } = await db.from("ingestion_runs").insert({}).select("id").single();

  const sectors = (await fetchAllSectors()).filter((s) => !only || s.symbol === only);
  if (sectors.length === 0) throw new Error(`No matching sector: ${only}`);

  let processed = 0, inserted = 0, updated = 0;
  const failedSectors: { symbol: string; reason: string }[] = [];

  for (const s of sectors) {
    console.log(`\n>>> ${s.symbol} (${s.name})`);

    if (s.error || !s.anomaly || typeof s.changePercent !== "number") {
      failedSectors.push({ symbol: s.symbol, reason: s.error ?? "missing market data" });
      console.error(`    skipped: ${s.error ?? "missing market data"}`);
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
      console.log(`    ${result.outcome}: +${counts.inserted} new, ${counts.updated} updated`);
      if (result.outcome !== "stories" && result.outcome !== "no_relevant_news") {
        failedSectors.push({ symbol: s.symbol, reason: result.outcome });
      }
    } catch (err) {
      console.error(`    save failed:`, err);
      failedSectors.push({ symbol: s.symbol, reason: err instanceof Error ? err.message : "save failed" });
    }

    await sleep(1500); // stay inside NewsData rate limits
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

  console.log("\n=== SUMMARY ===");
  console.log({ sectorsProcessed: processed, articlesInserted: inserted, articlesUpdated: updated, failedSectors });
  process.exit(failedSectors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Ingestion crashed:", err);
  process.exit(1);
});