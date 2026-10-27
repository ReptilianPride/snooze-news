"use client";

import { useState,useEffect } from "react";
import MarketOverview, { Selection } from "@/components/MarketOverview";
import NewsPanel from "@/components/NewsPanel";
import { fetchNews } from "@/lib/news-client";

type Tab = "home" | "news";

export default function Page() {
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<Tab>("home");

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    fetchNews("ALL")
      .then((d) => setLastUpdated(d.lastUpdated))
      .catch(() => setLastUpdated(null));
  }, []);

  const handleSelect = (s: Selection) => {
    setSelection(s);
    if (s !== null) setTab("news"); // auto-switch when a tile or GET ALL is clicked
  };

  const tabClass = (t: Tab) =>
    `px-5 py-2 text-xs font-bold tracking-widest border-b-2 transition-colors cursor-pointer ${
      tab === t
        ? "border-amber-400 text-amber-400 bg-neutral-950"
        : "border-transparent text-neutral-500 hover:text-neutral-200"
    }`;

  return (
    <main className="min-h-screen bg-black">
      <nav className="flex items-center border-b border-neutral-800 font-mono px-4">
        <div className="flex">
          <button onClick={() => setTab("home")} className={tabClass("home")}>HOME</button>
          <button onClick={() => setTab("news")} className={tabClass("news")}>
            NEWS{selection ? ` // ${selection === "ALL" ? "ALL" : selection}` : ""}
          </button>
        </div>

        <span className="ml-auto text-[10px] text-neutral-500 uppercase">
          Last updated{" "}
          <span className="text-neutral-300">
            {lastUpdated
              ? new Date(lastUpdated).toLocaleString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "--"}
          </span>
        </span>
      </nav>

      <div className={tab === "home" ? "" : "hidden"}>
        <MarketOverview selection={selection} onSelect={handleSelect} lastUpdated={lastUpdated} />
      </div>

      {tab === "news" &&
        (selection === null ? (
          <p className="p-4 font-mono text-xs text-neutral-500">
            Nothing selected. Go to HOME and click a sector or GET ALL.
          </p>
        ) : (
          <NewsPanel
            selection={selection}
            onBack={() => setTab("home")}
          />
        ))}
    </main>
  );
}