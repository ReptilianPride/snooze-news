import type { NewsResponse } from "./news-types";

const MOCK: NewsResponse = {
  briefings: [
    {
      symbol: "XLK",
      sector: "Technology",
      outcome: "stories",
      headline: "Chip demand and rate news in focus",
      summary: "Chipmakers reported steady demand. Rate expectations are also being watched.",
      generatedAt: "2026-10-15T08:00:00Z",
      stories: [
        {
          title: "Semiconductor demand stays firm into Q4",
          summary: "Chip companies say orders remain steady, though some warn about supply limits.",
          url: "https://example.com/chips",
          source: "example_news",
          publishedAt: "2026-10-14T14:30:00Z",
        },
        {
          title: "Fed officials signal patience on rates",
          summary: "Officials said they want more data before changing interest rates.",
          url: "https://example.com/fed",
          source: "example_wire",
          publishedAt: "2026-10-15T06:10:00Z",
        },
      ],
    },
    {
      symbol: "XLE",
      sector: "Energy",
      outcome: "stories",
      headline: "Gas supply deals and oil costs",
      summary: "A European gas deal was reported. Oil prices remain a topic.",
      generatedAt: "2026-10-15T08:00:00Z",
      stories: [
        {
          title: "Slovakia secures winter gas supplies",
          summary: "Slovakia signed a gas supply deal for the winter months.",
          url: "https://example.com/gas",
          source: "tass",
          publishedAt: "2026-10-09T13:21:35Z",
        },
      ],
    },
    {
      symbol: "XLB",
      sector: "Materials",
      outcome: "no_relevant_news",
      headline: "No major Materials news found",
      summary: "No strongly relevant sector news was found in the available search results.",
      generatedAt: "2026-10-15T08:00:00Z",
      stories: [],
    },
    {
      symbol: "XLC",
      sector: "Communication Services",
      outcome: "news_api_failed",
      headline: "",
      summary: "The news search failed. This is not the same as finding no news.",
      generatedAt: "2026-10-15T08:00:00Z",
      stories: [],
    },
  ],
};

// STEP 2: mock with fake delay. STEP 4: replace the body with a real fetch (see comment).
export async function fetchNews(selection: "ALL" | string): Promise<NewsResponse> {
  await new Promise((r) => setTimeout(r, 400));

  // Step 4 version:
  // const url = selection === "ALL" ? "/api/news" : `/api/news?symbol=${selection}`;
  // const res = await fetch(url);
  // if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // return res.json();

  if (selection === "ALL") return MOCK;
  return { briefings: MOCK.briefings.filter((b) => b.symbol === selection) };
}