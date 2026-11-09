"use client";

import { useEffect, useState } from "react";
import MarketOverview, { Selection } from "@/components/MarketOverview";
import NewsPanel from "@/components/NewsPanel";
import { fetchNews } from "@/lib/news-client";
import type { MarketResponse } from "@/lib/market-types";

export default function Page() {
  const [selection, setSelection] = useState<Selection>("ALL");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews("ALL")
      .then((d) => setLastUpdated(d.lastUpdated))
      .catch(() => setLastUpdated(null));
  }, []);

  useEffect(() => {
    fetch("/api/market")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMarket)
      .catch((e) => setMarketError(e.message));
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-canvas font-sans lg:h-screen lg:overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line px-4 py-2">
        <h1 className="flex items-center gap-2 text-xs font-bold tracking-widest text-ink">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          SNOOZE NEWS
        </h1>
        <span className="text-[11px] uppercase tracking-wide text-muted">
          Last updated{" "}
          <span className="text-subtle">
            {lastUpdated
              ? new Date(lastUpdated).toLocaleString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "--"}
          </span>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* Left: sectors, desktop only, 25% width, no scrolling */}
        <aside className="hidden min-h-0 flex-col rounded-lg border border-line bg-surface p-2 lg:flex lg:w-1/4 lg:min-w-[260px]">
          <MarketOverview data={market} error={marketError} selection={selection} onSelect={setSelection} />
        </aside>

        {/* Right: news (the only panel on mobile) */}
        <section className="min-h-0 flex-1 rounded-lg border border-line bg-surface lg:overflow-y-auto">
          <NewsPanel selection={selection} sectors={market?.sectors ?? []} onSelect={setSelection} />
        </section>
      </div>
    </main>
  );
}