import { NewsResult } from "./tools";

type InvestigationInput = {
    sector: string;
    symbol: string;
    zScore: number;
    changePercent: number;
}

export function investigationPlanPrompt(input:InvestigationInput):string{
    return `
You are helping investigate an unusual move in a US stock market sector ETF.

Sector: ${input.sector}
Ticker: ${input.symbol}
Price change: ${input.changePercent.toFixed(2)}%
Z-score: ${input.zScore.toFixed(2)} (statistical significance vs its 30-day baseline — this is already calculated, do not recalculate or second-guess it)

Produce a short investigation plan: 3-5 concrete steps someone would take to find out what likely caused this move (e.g. checking sector news, major constituent companies, macro events). Do not attempt to explain the cause yourself yet — only plan how to investigate it.

Respond with ONLY a JSON array of strings, no markdown, no commentary. Example:
["Check recent market context for Industrials", "Search for recent events affecting the Industrials sector", "Identify major companies or subsectors potentially contributing to the move"]
    `;
}

// how to make sure that it wont do any type of calculation

type NewsQueryInput = {
    sector: string;
    symbol: string;
    changePercent: number;
    investigationPlan: string[];
}

export function newsQueryPrompt(input: NewsQueryInput):string {
    const direction = input.changePercent >= 0 ? "rose" : "fell";
    const today = new Date().toISOString().slice(0,10);
    const NUMBER_OF_NEWS_QUERIES = 2

    return `
Today's date is ${today}. The ${input.sector} sector (${input.symbol}) ${direction} ${Math.abs(input.changePercent).toFixed(2)}% today, more than its usual daily movement.

Investigation plan for context:
${input.investigationPlan.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Your job: come up with ${NUMBER_OF_NEWS_QUERIES} news search queries most likely to surface the real-world reason for this move. The news must be from the last 48 hours. Each query must come from a DIFFERENT angle, chosen from:
- macro data or interest rates (jobs, inflation, Fed, yields)
- policy, tariffs or regulation
- sector-wide business news (orders, demand, supply chain, major company earnings)
- a stock market wrap (e.g. "stocks close Dow industrials")
- geopolitical events or disasters

Each query should be short (2-4 plain words) and describe a single concept or event, not a company name paired with a jargon term, and not multiple entities joined together (e.g. prefer "industrial tariffs" over "Caterpillar Honeywell earnings guidance").

Respond with ONLY a JSON array of exactly ${NUMBER_OF_NEWS_QUERIES} strings, no markdown, no commentary. Example:
["industrial sector tariffs", "manufacturing PMI report"]
    `
}

type EvidenceValidationInput = {
    sector: string;
    symbol: string;
    changePercent: number;
    investigationPlan: string[];
    news: NewsResult[];
}

export function evidenceValidationPrompt(input: EvidenceValidationInput):string {
    const direction = input.changePercent >= 0 ? "rose" : "fell";
    const articlesList = input.news.map((n,i)=>(
        `${i+1}. Title: ${n.title}\n    Source: ${n.source} | Published: ${n.publishedAt}\n Snippet: ${n.snippet}\n URL: ${n.url}`
    )).join("\n\n");

    return `
The ${input.sector} sector (${input.symbol}) ${direction} ${Math.abs(input.changePercent).toFixed(2)}% today, more than its usual daily movement.

Investigation plan:
${input.investigationPlan.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Retrieved news articles:
${articlesList}

Evaluate every article above for usefulness to someone monitoring this sector. Do not assume an article is relevant just because it mentions the sector name or a related keyword. Prefer recent, sector-specific news that would be useful to someone following this sector, including policy, earnings, macro data, geopolitical events, regulatory decisions, supply chains, major business developments, or other meaningful developments.

Select up to 5 of the most useful and relevant articles. The articles do not need to explain or cause the sector's price movement. If only 1 or 2 are genuinely relevant, return only those. If none are relevant, return an empty array []. Never include an article just to reach a minimum count.
Every article you include must have sectorRelevance set to true 

Respond with ONLY a JSON array, no markdown, no commentary, in this exact shape:
[
  {
    "title": "...",
    "url": "...",
    "relevance": 0.92,
    "sectorRelevance": true,
    "reason": "..."
  }
]
    `
}
// and a relevance of at least 0.5.