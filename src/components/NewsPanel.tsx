"use client";

import { useEffect, useState } from "react";
import { fetchNews } from "@/lib/news-client";
import type { NewsResponse, SectorBriefing } from "@/lib/news-types";

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Briefing({ b }: { b: SectorBriefing }) {
    const failed = b.outcome === "news_api_failed" || b.outcome === "llm_failed" || b.outcome === "unexpected_error";
    const stories = [...b.stories].sort((a, c) => +new Date(c.publishedAt) - +new Date(a.publishedAt));
    const empty = b.outcome === "no_relevant_news";

    const style = failed
        ? { label: "BRIEFING UNAVAILABLE", box: "border-red-500 bg-red-950/30", labelColor: "text-red-400", text: "text-red-300" }
        : empty
        ? { label: "NO RELEVANT NEWS", box: "border-neutral-600 bg-neutral-900/50", labelColor: "text-neutral-500", text: "text-neutral-400" }
        : { label: "AI BRIEFING", box: "border-amber-400 bg-amber-400/5", labelColor: "text-amber-400", text: "text-neutral-300" };

    return (
        <article className="border border-neutral-800 bg-neutral-950 mb-6">
        {/* Sector header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
            <div>
            <span className="text-amber-400 font-bold tracking-wider">{b.symbol}</span>
            <span className="text-neutral-400 ml-2">{b.sector}</span>
            </div>
            <span className="text-[10px] text-neutral-600">UPDATED {fmtDate(b.generatedAt)}</span>
        </div>

        {/* BRIEFING: amber, prominent */}
        <div className={`m-4 p-4 border-l-4 ${style.box}`}>
            <div className={`text-[10px] font-bold tracking-widest mb-2 ${style.labelColor}`}>
                {style.label}
            </div>
            {b.headline && !empty && (
                <h3 className="text-neutral-100 text-base font-bold leading-snug">{b.headline}</h3>
            )}
            <p className={`text-sm mt-2 leading-relaxed ${style.text}`}>{b.summary}</p>
            {stories.length > 0 && (
                <p className="text-[10px] text-neutral-600 mt-3 uppercase">
                Summarised from the {stories.length} article{stories.length > 1 ? "s" : ""} below
                </p>
            )}
        </div>

        {/* STORIES: grey, numbered, clearly separate */}
        {stories.length > 0 && (
            <div className="px-4 pb-4">
            <div className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2 border-b border-neutral-800 pb-1">
                SOURCE ARTICLES ({stories.length})
            </div>
            <ol className="space-y-2">
                {stories.map((s, i) => (
                <li key={s.url} className="flex gap-3 bg-neutral-900/60 border border-neutral-800 p-3">
                    <span className="text-neutral-600 text-xs tabular-nums pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-sky-300 hover:text-sky-200 hover:underline"
                    >
                        {s.title} ↗
                    </a>
                    <p className="text-xs text-neutral-400 mt-1">{s.summary}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase">
                        <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5">{s.source}</span>
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

export default function NewsPanel({ selection, onBack }: { selection: "ALL" | string; onBack: () => void }) {
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
        <section className="p-4 font-mono">
        <header className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4 text-xs">
            <h2 className="text-amber-400 font-bold tracking-widest">
            NEWS // {selection === "ALL" ? "ALL SECTORS" : selection}
            </h2>
            <button onClick={onBack} className="px-3 py-1 border border-neutral-700 text-neutral-400 hover:text-neutral-100">
            ← BACK TO HOME
            </button>
        </header>

        {error && <p className="text-red-400 text-sm">News failed to load: {error}</p>}
        {!data && !error && <p className="text-neutral-500 text-sm">Loading news...</p>}
        {data && data.briefings.length === 0 && (
            <p className="text-neutral-500 text-sm">No news has been stored for this selection yet.</p>
        )}
        {data && data.briefings.length > 0 && (
            <div
                className={
                data.briefings.length === 1
                    ? "max-w-3xl"
                    : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                }
            >
                {data.briefings.map((b) => (
                <Briefing key={b.symbol} b={b} />
                ))}
            </div>
        )}
        </section>
    );
}