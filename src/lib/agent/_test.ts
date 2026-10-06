import { investigationGraph } from "./graph";

async function main(){
    const result = await investigationGraph.invoke({
        symbol:"XLI",
        sector:"Industrials",
        zScore:1.65,
        changePercent:0.99,
    });
    console.log(result);
}

main();