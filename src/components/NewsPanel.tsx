"use client";

import { useEffect, useState } from "react";
import { fetchNews } from "@/lib/news-client";
import type { NewsResponse, SectorBriefing } from "@/lib/news-types";
import type { Sector } from "@/lib/market-types";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const pct = (n: number | null) => (n === null ? "--" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);

function Briefing({
  b,
  market,
  onSelect,
  showArticles,
}: {
  b: SectorBriefing;
  market?: Sector;
  onSelect: (s: string) => void;
  showArticles: boolean;
}) {
  const anomaly = market?.anomaly?.isAnomaly ?? false;
  const moveColor =
    !market || market.changePercent === null
      ? "text-muted"
      : market.changePercent >= 0
      ? "text-positive"
      : "text-negative";

  const failed = b.outcome === "news_api_failed" || b.outcome === "llm_failed" || b.outcome === "unexpected_error";
  const empty = b.outcome === "no_relevant_news";
  const stories = [...b.stories].sort((a, c) => +new Date(c.publishedAt) - +new Date(a.publishedAt));

  const style = failed
    ? { label: "BRIEFING UNAVAILABLE", box: "border-negative/40 bg-negative/10", labelColor: "text-negative", text: "text-subtle" }
    : empty
    ? { label: "NO RELEVANT NEWS", box: "border-line bg-raised", labelColor: "text-muted", text: "text-subtle" }
    : { label: "AI BRIEFING", box: "border-accent/40 bg-accent/5", labelColor: "text-accent", text: "text-subtle" };

  return (
    <article className="border border-line bg-surface">
      <div className="border-b border-line">
        {/* Mobile: clickable sector tile */}
        <button
          onClick={() => onSelect(b.symbol)}
          className={`flex w-full cursor-pointer items-center justify-between gap-2 border-l-4 px-4 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:hidden ${
            anomaly ? "border-accent" : "border-line"
          }`}
        >
          <span className="min-w-0">
            <span className="block truncate">
              <span className="font-mono text-xs font-bold text-accent">{b.symbol}</span>{" "}
              <span className="text-sm font-bold text-ink">{b.sector}</span>
            </span>
            {market?.price != null && (
              <span className="font-mono text-[11px] tabular-nums text-muted">${market.price.toFixed(2)}</span>
            )}
          </span>
          <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
            {anomaly && (
              <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">ANOMALY</span>
            )}
            <span className={moveColor}>{pct(market?.changePercent ?? null)}</span>
          </span>
        </button>

        {/* Desktop: plain label (the sidebar handles clicking) */}
        <div className="hidden px-4 py-2 lg:block">
          <span className="font-mono text-xs font-bold tracking-wider text-accent">{b.symbol}</span>
          <span className="ml-2 text-sm text-subtle">{b.sector}</span>
        </div>
      </div>

      <div className={`m-4 border-l-4 p-4 ${style.box}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-[11px] font-bold tracking-widest ${style.labelColor}`}>{style.label}</span>
          <span className="font-mono text-[11px] uppercase text-muted">Updated {fmtDate(b.generatedAt)}</span>
        </div>
        {b.headline && !empty && (
          <h3 className="text-base font-bold leading-snug text-ink">{b.headline}</h3>
        )}
        <p className={`mt-2 text-sm leading-relaxed ${style.text}`}>{b.summary}</p>
        {showArticles && stories.length > 0 && (
          <p className="mt-3 text-[11px] uppercase text-muted">
            Summarised from the {stories.length} article{stories.length > 1 ? "s" : ""} below
          </p>
        )}
      </div>

      {showArticles && stories.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 border-b border-line pb-1 text-[11px] font-bold tracking-widest text-muted">
            SOURCE ARTICLES ({stories.length})
          </div>
          <ol className="space-y-2">
            {stories.map((s, i) => (
              <li key={s.url} className="flex gap-3 rounded-md border border-line bg-raised p-3">
                <span className="pt-0.5 font-mono text-xs tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-info hover:text-info/80 hover:underline"
                  >
                    {s.title} ↗
                  </a>
                  <p className="mt-1 text-xs leading-relaxed text-subtle">{s.summary}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] uppercase">
                    <span className="rounded-sm bg-white/5 px-1.5 py-0.5 text-subtle">{s.source}</span>
                    <span className="font-mono text-muted">{fmtDate(s.publishedAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

export default function NewsPanel({
  selection,
  sectors,
  onSelect,
}: {
  selection: string;
  sectors: Sector[];
  onSelect: (s: string) => void;
}) {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchNews(selection)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [selection]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-2">
        <h2 className="text-xs font-bold tracking-widest text-ink">
          NEWS // {selection === "ALL" ? "ALL SECTORS" : selection}
        </h2>
        {selection !== "ALL" && (
          <button
            onClick={() => onSelect("ALL")}
            className="cursor-pointer rounded-md border border-accent/60 px-2 py-0.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:hidden"
          >
            ← ALL SECTORS
          </button>
        )}
      </div>

      {error && <p className="text-sm text-negative">News failed to load: {error}</p>}
      {!data && !error && <p className="text-sm text-subtle">Loading news...</p>}
      {data && data.briefings.length === 0 && (
        <p className="text-sm text-subtle">No news has been stored for this selection yet.</p>
      )}

        {data && data.briefings.length > 0 && (
        <div
            className={
            selection === "ALL"
                ? "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
                : "grid grid-cols-1 gap-4"
            }
        >
          {data.briefings.map((b) => (
            <Briefing
              key={b.symbol}
              b={b}
              market={sectors.find((s) => s.symbol === b.symbol)}
              onSelect={onSelect}
              showArticles={selection !== "ALL"}
            />
          ))}
        </div>
      )}
    </div>
  );
}