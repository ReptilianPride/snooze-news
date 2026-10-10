import {StateGraph, END, START} from "@langchain/langgraph";
import {AgentState,AgentStateType} from "./state";
import { askOpenCode } from "./llm";
import { evidenceValidationPrompt, investigationPlanPrompt, newsQueryPrompt, finalExplainationPrompt } from "./prompts";
import {searchNews} from "./tools";
import { NewsResult, Evidence, FinalExplanation } from "./state-types";


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

function parseFinalExplanation(raw:string):FinalExplanation {
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("LLM did not return a JSON object for the explanation");
    }
    if (typeof parsed.headline !== "string" || typeof parsed.summary !== "string") {
        throw new Error("Explanation is missing a string headline or summary");
    }
    if (!Array.isArray(parsed.stories)) {
        throw new Error("Explanation stories is not an array");
    }

    const stories = parsed.stories.map((s: any, i: number) => {
        if (typeof s !== "object" || s === null || typeof s.title !== "string" || typeof s.summary !== "string") {
            throw new Error(`Story ${i} is missing a string title or summary`);
        }
        return { title: s.title, summary: s.summary };
    });

    return { headline: parsed.headline, summary: parsed.summary, stories };
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
        console.error("[investigateNode] failed:", err);
        return {
            investigationStatus: "plan_failed",
            investigationPlan:[],
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

        console.log(`[${state.symbol}] Queries (${queries.length}):`, queries);

        const settled = await Promise.allSettled(queries.map((q) => searchNews(q)));
        settled.forEach((r,i)=>{
            if (r.status === "rejected") console.error(`[${state.symbol}] Query "${queries[i]}" failed:`, r.reason);
        })

        const fulfilled = settled.filter(
            (r): r is PromiseFulfilledResult<NewsResult[]> => r.status === "fulfilled"
        );
        if(fulfilled.length === 0) throw new Error("All news searches failed");

        const seen = new Set<string>();
        const news = fulfilled
            .flatMap((r) => r.value)
            .filter((n) => {
                if (!n.url || seen.has(n.url)) return false;
                seen.add(n.url);
                return true;
            });

        console.log(`[${state.symbol}] Raw articles after dedupe: ${news.length}`);

        // const resultsPerQuery = await Promise.all(queries.map((q)=>searchNews(q)));
        // const news:NewsResult[] = resultsPerQuery.flat();

        return {
            investigationStatus: "news_retrieved",
            news,
        };
        
    } catch(err){
        console.error("[searchNewsNode] failed:", err);
        return{
            investigationStatus: "news_search_failed",
        };
    }
}

async function validateEvidenceNode(state:AgentStateType): Promise<Partial<AgentStateType>> {
    if(state.investigationStatus !== 'news_retrieved'){
        return {};
    }

    if (state.news.length === 0) {
        return { investigationStatus: "no_relevant_news", evidence: [] };
    }

    try{
        const raw = await askOpenCode(evidenceValidationPrompt(state));
        const evidence = parseEvidence(raw);

        return {
            investigationStatus: evidence.length > 0 ? "evidence_validated" : "no_relevant_evidence",
            evidence,
        };
    } catch(err){
        console.error("[validateEvidenceNode] failed:", err);
        return {
            investigationStatus: "evidence_validation_failed",
            evidence:[],
        };
    }
}

async function generateExplanationNode(state: AgentStateType): Promise<Partial<AgentStateType>>{
    if (state.investigationStatus === "no_relevant_news") {
        return {
            finalExplanation: {
            headline: `No major ${state.sector} news found`,
            summary: "No strongly relevant sector news was found in the available search results.",
            stories: [],
            },
        };
    }
    
    if(state.investigationStatus !== "evidence_validated"){
        return {};
    }

    try{
        const raw = await askOpenCode(finalExplainationPrompt(state));
        const finalExplanation = parseFinalExplanation(raw);

        return {
            investigationStatus: "explanation_generated",
            finalExplanation,
        };
    } catch(err){
        console.error("[generateExplanationNode] failed:", err);
        return {
            investigationStatus: "explanation_failed",
            finalExplanation: undefined,
        };
    }
}

const graph = new StateGraph(AgentState)
    .addNode("investigate",investigate)
    .addNode("searchNews", searchNewsNode)
    .addNode("validateEvidence",validateEvidenceNode)
    .addNode("generateExplanation", generateExplanationNode)
    .addEdge(START,"investigate")
    .addEdge("investigate","searchNews")
    .addEdge("searchNews","validateEvidence")
    .addEdge("validateEvidence","generateExplanation")
    .addEdge("generateExplanation",END)

export const investigationGraph = graph.compile();