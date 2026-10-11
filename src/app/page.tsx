"use client"

import { useState } from "react";
import MarketOverview, {Selection} from "@/components/MarketOverview";

export default function Page() {
  const [selection, setSelection] = useState<Selection>(null);

  return (
    <main className="min-h-screen bg-black">
      <MarketOverview selection={selection} onSelect={setSelection} />
      <div className="p-4 font-mono text-xs text-neutral-500">
        {selection === null ? "Select a sector or GET ALL." : `Selected: ${selection}`}
      </div>
    </main>
  );
}