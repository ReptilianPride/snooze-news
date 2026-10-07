import {Annotation} from "@langchain/langgraph";
import { NewsResult, Evidence } from "./state-types";

export const AgentState = Annotation.Root({
    symbol: Annotation<string>,
    sector: Annotation<string>,
    zScore: Annotation<number>,
    changePercent: Annotation<number>,

    // Agent workflow fields
    investigationStatus: Annotation<string | undefined>({
        reducer: (_prev, next) => next,
        default: () => "pending",
    }),
    investigationPlan: Annotation<string[]>({
        reducer: (_prev,next) => next,
        default: () => [],
    }),
    news: Annotation<NewsResult[]>({
        reducer: (_prev,next)=>next,
        default: ()=>[],
    }),
    evidence: Annotation<Evidence[]>({
        reducer: (_prev,next)=>next,
        default: ()=>[],
    }),
    finalExplanation: Annotation<string|undefined>({
        reducer: (_prev,next)=>next,
        default: ()=>undefined,
    }),
});

export type AgentStateType = typeof AgentState.State;
