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
    s.changePercent === null
      ? "text-muted"
      : s.changePercent >= 0
      ? "text-positive"
      : "text-negative";
  const border = anomaly ? "border-accent/40" : selected ? "border-accent/50" : "border-line";
  const moveArrow = s.changePercent === null ? "" : s.changePercent >= 0 ? "▲" : "▼";

  return (
    <button
      onClick={onClick}
      disabled={!!s.error}
      className={`flex min-h-0 cursor-pointer flex-col justify-center overflow-hidden rounded-md border px-2.5 py-1 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50 ${border} ${
        selected ? "bg-white/5 ring-1 ring-accent/30" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-bold text-ink">
          {s.name}{" "}
          <span className="font-mono text-[11px] font-normal text-muted">({s.symbol})</span>
        </span>
        <span className={`flex items-center gap-1 font-mono text-sm tabular-nums ${moveColor}`}>
          <span className="text-[8px]">{moveArrow}</span>
          {pct(s.changePercent)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-subtle">
        <span className="truncate">
          ${fmt(s.price)} <span className="text-muted">| 1W ${fmt(s.weekAgoClose)}</span>
        </span>
        {(anomaly || s.error) && (
          <span
            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
              s.error
                ? "bg-negative/10 text-negative"
                : "bg-accent/10 text-accent"
            }`}
          >
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
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold tracking-widest text-subtle">SECTORS</span>
        <span className="flex items-center gap-1.5 text-muted">
          NYSE
          <span className={`flex items-center gap-1 ${session === "OPEN" ? "text-positive" : "text-negative"}`}>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                session === "OPEN" ? "bg-positive" : "bg-negative"
              }`}
            />
            {session}
          </span>
        </span>
      </div>

      <button
        onClick={() => onSelect("ALL")}
        className={`cursor-pointer rounded-md border px-3 py-1 text-xs font-bold tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          selection === "ALL"
            ? "border-accent/60 bg-accent/15 text-accent"
            : "border-line text-subtle hover:bg-white/5 hover:text-ink"
        }`}
      >
        ALL SECTORS
      </button>

      {error && <p className="text-sm text-negative">Market data failed to load: {error}</p>}
      {!data && !error && <p className="text-sm text-subtle">Loading market data...</p>}

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