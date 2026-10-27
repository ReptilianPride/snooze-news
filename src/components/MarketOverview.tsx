"use client";

import type { Sector, MarketResponse } from "@/lib/market-types";

export type Selection = string; // "ALL" or a ticker symbol

function sessionStatus(now = new Date()): "OPEN" | "CLOSED" {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const weekday = !["Sat", "Sun"].includes(get("weekday"));
  return weekday && mins >= 570 && mins < 960 ? "OPEN" : "CLOSED";
}

const fmt = (n: number | null) => (n === null ? "--" : n.toFixed(2));
const pct = (n: number | null) => (n === null ? "--" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);

function Row({ s, selected, onClick }: { s: Sector; selected: boolean; onClick: () => void }) {
  const anomaly = s.anomaly?.isAnomaly ?? false;
  const moveColor =
    s.changePercent === null ? "text-neutral-500" : s.changePercent >= 0 ? "text-green-400" : "text-red-400";
  const border = anomaly ? "border-amber-400" : selected ? "border-neutral-300" : "border-neutral-800";

  return (
    <button
      onClick={onClick}
      disabled={!!s.error}
      className={`flex min-h-0 cursor-pointer flex-col justify-center overflow-hidden rounded border px-2.5 py-1 text-left transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 ${border} ${
        selected ? "bg-neutral-900" : "bg-black"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-amber-400">
          {s.name} ({s.symbol})
        </span>
        <span className={`text-sm tabular-nums ${moveColor}`}>{pct(s.changePercent)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums text-neutral-500">
        <span className="truncate">
          ${fmt(s.price)} <span className="text-neutral-600">| 1W ${fmt(s.weekAgoClose)}</span>
        </span>
        {(anomaly || s.error) && (
          <span className={`px-1 font-bold ${s.error ? "text-red-400" : "bg-amber-400 text-black"}`}>
            {s.error ? "ERROR" : "ANOMALY"}
          </span>
        )}
      </div>
    </button>
  );
}

export default function MarketOverview({
  data,
  error,
  selection,
  onSelect,
}: {
  data: MarketResponse | null;
  error: string | null;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const session = sessionStatus();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold tracking-widest text-amber-400">SECTORS</span>
        <span className="text-neutral-400">
          NYSE <span className={session === "OPEN" ? "text-green-400" : "text-red-400"}>{session}</span>
        </span>
      </div>

      <button
        onClick={() => onSelect("ALL")}
        className={`cursor-pointer border px-3 py-1 text-xs font-bold tracking-wider ${
          selection === "ALL"
            ? "border-amber-400 bg-amber-400 text-black"
            : "border-amber-400 text-amber-400 hover:bg-amber-400/10"
        }`}
      >
        ALL SECTORS
      </button>

      {error && <p className="text-sm text-red-400">Market data failed to load: {error}</p>}
      {!data && !error && <p className="text-sm text-neutral-500">Loading market data...</p>}

      {data && (
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[repeat(11,minmax(0,1fr))] gap-1.5">
          {data.sectors.map((s) => (
            <Row key={s.symbol} s={s} selected={selection === s.symbol} onClick={() => onSelect(s.symbol)} />
          ))}
        </div>
      )}
    </div>
  );
}