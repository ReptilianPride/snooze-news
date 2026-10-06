import {StateGraph, END, START} from "@langchain/langgraph";
import {AgentState,AgentStateType} from "./state";
import { askOpenCode } from "./llm";
import { investigationPlanPrompt } from "./prompts";

function parsePlan(raw:string):string[]{
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if(!Array.isArray(parsed)||!parsed.every((p)=> typeof p === "string")){
        throw new Error("LLM did not return a JSON array of strings");
    }
    return parsed;
}


async function investigate(state:AgentStateType): Promise<Partial<AgentStateType>>{
    const prompt = investigationPlanPrompt(state);

    try{
        const raw = await askOpenCode(prompt);
        const plan = parsePlan(raw);

        return {
            investigationStatus: "plan_generated",
            investigationPlan: plan,
        };
    } catch(err){
        return {
            investigationStatus: "plan_failed",
            investigationPlan:[],
            finalExplanation: `Investigation plan failed: ${err instanceof Error? err.message : "unknwon error"}`,
        };
    }
}

const graph = new StateGraph(AgentState)
    .addNode("investigate",investigate)
    .addEdge(START,"investigate")
    .addEdge("investigate",END)

export const investigationGraph = graph.compile();