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
    const NUMBER_OF_NEWS_QUERIES = 2

    return `
The ${input.sector} sector (${input.symbol}) ${direction} ${Math.abs(input.changePercent).toFixed(2)}% today, more than its usual daily movement.

Investigation plan for context:
${input.investigationPlan.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Your job: come up with ${NUMBER_OF_NEWS_QUERIES} news search queries most likely to surface the real-world reason for this move. Think broadly — it could be a policy change, tariffs, a major company's earnings or guidance, a geopolitical event, a regulatory decision, a supply chain disruption, a natural disaster, or broad macroeconomic data (jobs, inflation, rates).

Each query should be short (3-6 words) and describe a single concept or event — not a company name paired with a jargon term, and not multiple entities joined together (e.g. prefer "industrial tariffs" over "Caterpillar Honeywell earnings guidance").

Respond with ONLY a JSON array of exactly 2 strings, no markdown, no commentary. Example:
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

Evaluate every article above for relevance to explaining this specific sector move. Do not assume an article explains the move just because it mentions the sector name or a related keyword — it must plausibly relate to an actual catalyst (policy, earnings, macro data, geopolitical event, regulatory decision, supply chain, disaster, etc.) for this sector around this time. Prefer recent, sector-specific, catalyst-related news over tangential or unrelated matches.

Select up to 5 pieces of evidence, but only include articles that genuinely and directly explain this specific move. If only 1 or 2 qualify, return only those. If none qualify, return an empty array []. Never include an article just to reach a minimum count. Every article you include must have supportsAnomaly set to true and a relevance of at least 0.5.

Respond with ONLY a JSON array, no markdown, no commentary, in this exact shape:
[
  {
    "title": "...",
    "url": "...",
    "relevance": 0.92,
    "supportsAnomaly": true,
    "reason": "..."
  }
]
    `
}