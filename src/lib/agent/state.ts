import {Annotation} from "@langchain/langgraph";
import { NewsResult, Evidence, FinalExplanation } from "./state-types";

// For testing (remove for nextjs server)
import dotenv from "dotenv";
dotenv.config({path:".env.local"});
// For testing end

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
    finalExplanation: Annotation<FinalExplanation|undefined>({
        reducer: (_prev,next)=>next,
        default: ()=>undefined,
    }),
});

export type AgentStateType = typeof AgentState.State;
