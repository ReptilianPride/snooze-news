import {StateGraph, END, START} from "@langchain/langgraph";
import {AgentState,AgentStateType} from "./state";
import { askOpenCode } from "./llm";
import { evidenceValidationPrompt, investigationPlanPrompt, newsQueryPrompt, finalExplanationPrompt } from "./prompts";
import {searchNews} from "./tools";
import { NewsResult, Evidence, FinalExplanation, FinalStory } from "./state-types";


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
function parseEvidence(raw: string, news: NewsResult[]): Evidence[] {
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
        throw new Error("LLM did not return a JSON array for evidence");
    }

    const byUrl = new Map(news.map((n) => [n.url, n]));
    const seen = new Set<string>();
    const validated: Evidence[] = [];

    parsed.forEach((item, i) => {
        if (
            typeof item !== "object" ||
            item === null ||
            typeof item.url !== "string" ||
            typeof item.relevance !== "number" ||
            typeof item.sectorRelevance !== "boolean" ||
            typeof item.reason !== "string"
        ) {
            throw new Error(`Evidence item ${i} is missing or has invalid required fields`);
        }

        const article = byUrl.get(item.url);
        if (!article) {
            console.warn(`[parseEvidence] dropped unknown URL: ${item.url}`);
            return;
        }
        if (seen.has(item.url)) return;
        seen.add(item.url);

        validated.push({
            title: article.title,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt,
            snippet: article.snippet,
            relevance: item.relevance,
            sectorRelevance: item.sectorRelevance,
            reason: item.reason,
        });
    });

    return validated
        .filter((e) => e.sectorRelevance && e.relevance >= MIN_RELEVANCE && e.relevance <= 1)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, MAX_EVIDENCE);
}

export function parseFinalExplanation(raw: string, evidence: Evidence[]): FinalExplanation {
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

    const byUrl = new Map(evidence.map((e) => [e.url, e]));
    const used = new Set<string>();
    const stories: FinalStory[] = [];

    parsed.stories.forEach((s: any, i: number) => {
        if (typeof s !== "object" || s === null || typeof s.url !== "string" || typeof s.summary !== "string") {
            console.warn(`[parseFinalExplanation] story ${i} rejected: missing url or summary`);
            return;
        }
        const article = byUrl.get(s.url);
        if (!article || used.has(s.url)) {
            console.warn(`[parseFinalExplanation] story ${i} rejected: unmatched or repeated URL ${s.url}`);
            return;
        }
        used.add(s.url);
        stories.push({
            title: article.title,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt,
            summary: s.summary,
        });
    });

    if (stories.length === 0) throw new Error("No story matched a validated article");

    return { headline: parsed.headline, summary: parsed.summary, stories: stories.slice(0, 4) };
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
        return { investigationStatus: "no_relevant_evidence", evidence: [] };
    }

    try{
        const raw = await askOpenCode(evidenceValidationPrompt(state));
        const evidence = parseEvidence(raw, state.news);

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
    
    if(state.investigationStatus !== "evidence_validated"){
        return {};
    }

    try{
        const raw = await askOpenCode(finalExplanationPrompt(state));
        const finalExplanation = parseFinalExplanation(raw, state.evidence);

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