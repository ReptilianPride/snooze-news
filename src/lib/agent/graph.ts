import {StateGraph, END, START} from "@langchain/langgraph";
import {AgentState,AgentStateType} from "./state";
import { askOpenCode } from "./llm";
import { evidenceValidationPrompt, investigationPlanPrompt, newsQueryPrompt } from "./prompts";
import {searchNews} from "./tools";
import { NewsResult, Evidence } from "./state-types";


function parseJsonArray(raw:string):string[]{
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if(!Array.isArray(parsed)||!parsed.every((p)=> typeof p === "string")){
        throw new Error("LLM did not return a JSON array of strings");
    }
    return parsed;
}

const MIN_RELEVANCE = 0.5;
const MAX_EVIDENCE = 5;
function parseEvidence(raw:string):Evidence[] {
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
        throw new Error("LLM did not return a JSON array for evidence");
    }

    const validated:Evidence[] = parsed.map((item,i)=>{
        if(
            typeof item !== "object" ||
            item === null ||
            typeof item.title !== "string" ||
            typeof item.url !== "string" ||
            typeof item.relevance !== "number" ||
            typeof item.sectorRelevance !== "boolean" ||
            typeof item.reason !== "string"
        ){
            throw new Error(`Evidence item ${i} is missing or has invalid required fields`);
        }
        return {
            title: item.title,
            url: item.url,
            relevance: item.relevance,
            sectorRelevance: item.sectorRelevance,
            reason: item.reason,
        };
    });

    return validated
        .filter((e)=>e.sectorRelevance && e.relevance >= MIN_RELEVANCE && e.relevance <=1)
        .sort((a,b)=> b.relevance - a.relevance)
        .slice(0,MAX_EVIDENCE);
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

async function validateEvidenceNode(state:AgentStateType): Promise<Partial<AgentStateType>> {
    if(state.investigationStatus !== 'news_retrieved'){
        return {};
    }

    try{
        const raw = await askOpenCode(evidenceValidationPrompt(state));
        const evidence = parseEvidence(raw);

        return {
            investigationStatus: evidence.length > 0 ? "evidence_validated" : "no_relevant_evidence",
            evidence,
        };
    } catch(err){
        return {
            investigationStatus: "evidence_validation_failed",
            evidence:[],
            finalExplanation: `Evidence validation failed: ${err instanceof Error ? err.message : "unknown error"}`,
        };
    }
}


const graph = new StateGraph(AgentState)
    .addNode("investigate",investigate)
    .addNode("searchNews", searchNewsNode)
    .addNode("validateEvidence",validateEvidenceNode)
    .addEdge(START,"investigate")
    .addEdge("investigate","searchNews")
    .addEdge("searchNews","validateEvidence")
    .addEdge("validateEvidence",END)

export const investigationGraph = graph.compile();