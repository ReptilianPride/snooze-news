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