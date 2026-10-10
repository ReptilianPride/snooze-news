import { investigationGraph } from "./graph";
import { fetchAllSectors } from "../market/yahoo";

function logSummary(state: any) {
  console.log(`
    ${state.symbol}
    Raw articles: ${state.news.length}
    Relevant articles: ${state.evidence.length}
    Final stories: ${state.finalExplanation?.stories.length ?? 0}
    Status: ${state.investigationStatus}
    `);
}


async function main(){
    const sectors = await fetchAllSectors();
    const testCases = sectors.flatMap((s) => {
        if (s.error || !s.anomaly || typeof s.changePercent !== "number") return [];
        return [{
            symbol: s.symbol,
            sector: s.name,
            zScore: s.anomaly.zScore,
            changePercent: s.changePercent,
        }];
    });
    
    const selected = testCases.filter((d)=>{
        if(["XLK","XLE","XLRE"].includes(d.symbol)){
            return true
        }
    })

    for (const tc of selected) {
        console.log(`[!]Agent runnign for ${tc.symbol}:${tc.sector}`);
        try {
            const result = await investigationGraph.invoke(tc);
            logSummary(result);
            console.log(JSON.stringify(result.finalExplanation, null, 2));
        } catch (err) {
            console.error(`[${tc.symbol}] run crashed:`, err);
        }
        console.log("=".repeat(50));
    }
}



main().catch(console.error);