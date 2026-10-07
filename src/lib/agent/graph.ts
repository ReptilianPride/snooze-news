import {StateGraph, END, START} from "@langchain/langgraph";
import {AgentState,AgentStateType} from "./state";
import { askOpenCode } from "./llm";
import { investigationPlanPrompt, newsQueryPrompt } from "./prompts";
import {searchNews, NewsResult} from "./tools";


function parseJsonArray(raw:string):string[]{
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
        const plan = parseJsonArray(raw);

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

async function searchNewsNode(state: AgentStateType): Promise<Partial<AgentStateType>>{
    if(state.investigationStatus !== "plan_generated"){
        return {};
    }

    try{
        const raw = await askOpenCode(newsQueryPrompt(state));
        const queries = parseJsonArray(raw);

        const resultsPerQuery = await Promise.all(queries.map((q)=>searchNews(q)));
        const news:NewsResult[] = resultsPerQuery.flat();

        return {
            investigationStatus: "news_retrieved",
            news,
        };
    } catch(err){
        return{
            investigationStatus: "news_search_failed",
            finalExplanation: `News search failed: ${err instanceof Error ? err.message : "unknown error"}`,
        };
    }
}


const graph = new StateGraph(AgentState)
    .addNode("investigate",investigate)
    .addNode("searchNews", searchNewsNode)
    .addEdge(START,"investigate")
    .addEdge("investigate","searchNews")
    .addEdge("searchNews",END)

export const investigationGraph = graph.compile();