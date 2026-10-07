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