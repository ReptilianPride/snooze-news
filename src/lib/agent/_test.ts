import { investigationGraph } from "./graph";
import { fetchAllSectors } from "../market/yahoo";
import { StateInput } from "./state-types";

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

    for (const tc of testCases) {
        try {
            const result = await investigationGraph.invoke(tc);
            logSummary(result);
            console.log(JSON.stringify(result.finalExplanation, null, 2));
        } catch (err) {
            console.error(`[${tc.symbol}] run crashed:`, err);
        }
        console.log("=".repeat(50));
    }

    // const result = await investigationGraph.invoke({
    //     symbol:"XLI",
    //     sector:"Industrials",
    //     zScore:1.65,
    //     changePercent:0.99,
    // });
    // // console.log(result);
    // console.log(JSON.stringify(result.finalExplanation, null,2));
    // console.log(result.evidence.map((e)=> e.title));

    // logSummary(result);
}



main().catch(console.error);