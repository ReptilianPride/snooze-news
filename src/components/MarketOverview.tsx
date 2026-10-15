"use client"

import { useEffect, useState } from "react";

type Sector = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  weekAgoClose: number | null;
  weeklyChangePercent: number | null;
  asOf: string | null;
  anomaly: { isAnomaly: boolean; zScore: number } | null;
  error?: string;
};

type MarketResponse = {
    updatedAt: string; 
    okCount: number; 
    sectors: Sector[] 
};

export type Selection = "ALL" | string | null;

function sessionStatus(now = new Date()): "OPEN" | "CLOSED"{
    const parts = new Intl.DateTimeFormat("en-US",{
        timeZone: "America/New_York",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(now);
    const get = (t:string) => parts.find((p)=>p.type === t)?.value ?? "";
    const mins = Number(get("hour")) * 60 + Number(get("minute"));
    const weekday = !["Sat","Sun"].includes(get("weekday"));
    return weekday && mins >= 570 && mins < 960 ? "OPEN" : "CLOSED";
}

const fmt = (n: number | null, d = 2) => (n === null ? "--" : n.toFixed(d));
const pct = (n: number | null) => (n === null ? "--" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);

function Tile({ s, selected, onClick }: { s: Sector; selected: boolean; onClick: () => void }) {
  const anomaly = s.anomaly?.isAnomaly ?? false;
  const up = (s.changePercent ?? 0) >= 0;
  const moveColor = s.changePercent === null ? "text-neutral-500" : up ? "text-green-400" : "text-red-400";
  const border = anomaly ? "border-amber-400" : selected ? "border-neutral-300" : "border-neutral-800";

  return (
    <button
      onClick={onClick}
      disabled={!!s.error}
      className={`text-left bg-neutral-950 border ${border} p-3 hover:bg-neutral-900 transition-colors disabled:opacity-50 font-mono cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <span className="text-amber-400 font-bold tracking-wider">{s.symbol}</span>
        <span className={`text-[10px] px-1.5 py-0.5 ${anomaly ? "bg-amber-400 text-black font-bold" : "text-neutral-500 border border-neutral-800"}`}>
          {s.error ? "ERROR" : anomaly ? "ANOMALY" : "NORMAL"}
        </span>
      </div>
      <div className="text-xs text-neutral-400 mt-0.5 truncate">{s.name}</div>

      <div className={`text-2xl mt-2 tabular-nums ${moveColor}`}>{pct(s.changePercent)}</div>
      <div className="text-[10px] text-neutral-600 uppercase">Daily</div>

      <div className="grid grid-cols-2 gap-2 mt-2 text-xs tabular-nums">
        <div>
          <div className="text-[10px] text-neutral-600 uppercase">Last close</div>
          <div className="text-neutral-200">${fmt(s.price)}</div>
        </div>
        <div>
          <div className="text-[10px] text-neutral-600 uppercase">1W ago</div>
          <div className="text-neutral-400">${fmt(s.weekAgoClose)}</div>
        </div>
      </div>
    </button>
  );
}

export default function MarketOverview({selection, onSelect}:{selection: Selection; onSelect: (s:Selection)=>void;}){
    const [data, setData] = useState<MarketResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/market")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(setData)
        .catch((e) => setError(e.message));
    }, []);

    const session = sessionStatus();

    return (
        <section className="bg-black text-neutral-200 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2 mb-3 font-mono text-xs">
            <h1 className="text-amber-400 font-bold tracking-widest">SECTOR HEARTBEAT // MARKET OVERVIEW</h1>
            <div className="flex items-center gap-4 text-neutral-400">
            <span>
                NYSE <span className={session === "OPEN" ? "text-green-400" : "text-red-400"}>{session}</span>
            </span>
            <span>AS OF {data ? new Date(data.updatedAt).toLocaleString() : "--"}</span>
            <button
                onClick={() => onSelect("ALL")}
                className={`px-3 py-1 border cursor-pointer ${selection === "ALL" ? "bg-amber-400 text-black border-amber-400" : "border-amber-400 text-amber-400 hover:bg-amber-400/10"}`}
            >
                GET ALL
            </button>
            </div>
        </header>

        {error && <p className="text-red-400 font-mono text-sm">Market data failed to load: {error}</p>}
        {!data && !error && <p className="text-neutral-500 font-mono text-sm">Loading market data...</p>}

        {data && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {data.sectors.map((s) => (
                <Tile key={s.symbol} s={s} selected={selection === s.symbol} onClick={() => onSelect(s.symbol)} />
            ))}
            </div>
        )}
        </section>
    );
}