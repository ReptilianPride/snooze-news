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
      ? "text-neutral-500"
      : market.changePercent >= 0
      ? "text-green-400"
      : "text-red-400";

  const failed = b.outcome === "news_api_failed" || b.outcome === "llm_failed" || b.outcome === "unexpected_error";
  const empty = b.outcome === "no_relevant_news";
  const stories = [...b.stories].sort((a, c) => +new Date(c.publishedAt) - +new Date(a.publishedAt));

  const style = failed
    ? { label: "BRIEFING UNAVAILABLE", box: "border-red-500 bg-red-950/30", labelColor: "text-red-400", text: "text-red-300" }
    : empty
    ? { label: "NO RELEVANT NEWS", box: "border-neutral-600 bg-neutral-900/50", labelColor: "text-neutral-500", text: "text-neutral-400" }
    : { label: "AI BRIEFING", box: "border-amber-400 bg-amber-400/5", labelColor: "text-amber-400", text: "text-neutral-300" };

  return (
    <article className="border border-neutral-800 bg-black">
      <div className="border-b border-neutral-800">
        {/* Mobile: clickable sector tile */}
        <button
          onClick={() => onSelect(b.symbol)}
          className={`flex w-full cursor-pointer items-center justify-between gap-2 border-l-4 px-4 py-2 text-left hover:bg-neutral-900 lg:hidden ${
            anomaly ? "border-amber-400" : "border-neutral-700"
          }`}
        >
          <span className="min-w-0">
            <span className="block truncate font-bold text-amber-400">
              {b.sector} ({b.symbol})
            </span>
            {market?.price != null && (
              <span className="text-[10px] tabular-nums text-neutral-500">${market.price.toFixed(2)}</span>
            )}
          </span>
          <span className="flex items-center gap-2 text-sm tabular-nums">
            {anomaly && <span className="bg-amber-400 px-1 text-[10px] font-bold text-black">ANOMALY</span>}
            <span className={moveColor}>{pct(market?.changePercent ?? null)}</span>
          </span>
        </button>

        {/* Desktop: plain label (the sidebar handles clicking) */}
        <div className="hidden px-4 py-2 lg:block">
          <span className="font-bold tracking-wider text-amber-400">{b.symbol}</span>
          <span className="ml-2 text-neutral-400">{b.sector}</span>
        </div>
      </div>

      <div className={`m-4 border-l-4 p-4 ${style.box}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className={`text-[10px] font-bold tracking-widest ${style.labelColor}`}>{style.label}</span>
          <span className="text-[10px] uppercase text-neutral-500">Updated {fmtDate(b.generatedAt)}</span>
        </div>
        {b.headline && !empty && (
          <h3 className="text-base font-bold leading-snug text-neutral-100">{b.headline}</h3>
        )}
        <p className={`mt-2 text-sm leading-relaxed ${style.text}`}>{b.summary}</p>
        {showArticles && stories.length > 0 && (
          <p className="mt-3 text-[10px] uppercase text-neutral-600">
            Summarised from the {stories.length} article{stories.length > 1 ? "s" : ""} below
          </p>
        )}
      </div>

      {showArticles && stories.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 border-b border-neutral-800 pb-1 text-[10px] font-bold tracking-widest text-neutral-500">
            SOURCE ARTICLES ({stories.length})
          </div>
          <ol className="space-y-2">
            {stories.map((s, i) => (
              <li key={s.url} className="flex gap-3 border border-neutral-800 bg-neutral-900/60 p-3">
                <span className="pt-0.5 text-xs tabular-nums text-neutral-600">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-300 hover:text-sky-200 hover:underline"
                  >
                    {s.title} ↗
                  </a>
                  <p className="mt-1 text-xs text-neutral-400">{s.summary}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] uppercase">
                    <span className="bg-neutral-800 px-1.5 py-0.5 text-neutral-300">{s.source}</span>
                    <span className="text-neutral-600">{fmtDate(s.publishedAt)}</span>
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
      <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-2">
        <h2 className="text-xs font-bold tracking-widest text-amber-400">
          NEWS // {selection === "ALL" ? "ALL SECTORS" : selection}
        </h2>
        {selection !== "ALL" && (
          <button
            onClick={() => onSelect("ALL")}
            className="cursor-pointer border border-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-400/10 lg:hidden"
          >
            ← ALL SECTORS
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">News failed to load: {error}</p>}
      {!data && !error && <p className="text-sm text-neutral-500">Loading news...</p>}
      {data && data.briefings.length === 0 && (
        <p className="text-sm text-neutral-500">No news has been stored for this selection yet.</p>
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