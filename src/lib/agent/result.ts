import { investigationGraph } from "./graph";
import type { AgentStateType } from "./state";
import type { FinalStory } from "./state-types";

export type SectorOutcome =
  | "stories" | "no_relevant_news" | "news_api_failed" | "llm_failed" | "unexpected_error";

export type SectorResult = {
  symbol: string;
  sector: string;
  outcome: SectorOutcome;
  status: string;
  message: string;
  headline: string;
  summary: string;
  stories: FinalStory[];
};

type Input = Pick<AgentStateType, "symbol" | "sector" | "zScore" | "changePercent">;

const LLM_FAILURES = new Set(["plan_failed", "evidence_validation_failed", "explanation_failed"]);

function toSectorResult(input: Input, state?: AgentStateType, error?: unknown): SectorResult {
  const base = { symbol: input.symbol, sector: input.sector, status: state?.investigationStatus ?? "crashed" };
  const empty = { headline: "", summary: "", stories: [] as FinalStory[] };
  const status = state?.investigationStatus;

  if (!state) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return { ...base, ...empty, outcome: "unexpected_error", message: `Unexpected error: ${msg}` };
  }
  if (status === "explanation_generated" && state.finalExplanation && state.finalExplanation.stories.length > 0) {
    return { ...base, ...state.finalExplanation, outcome: "stories", message: "" };
  }
  if (status === "no_relevant_evidence") {
    return {
      ...base, ...empty, outcome: "no_relevant_news",
      headline: `No major ${input.sector} news found`,
      summary: "No strongly relevant sector news was found in the available search results.",
      message: "No strongly relevant sector news was found in the available search results.",
    };
  }
  if (status === "news_search_failed") {
    return { ...base, ...empty, outcome: "news_api_failed", message: "The news search failed." };
  }
  if (status && LLM_FAILURES.has(status)) {
    return { ...base, ...empty, outcome: "llm_failed", message: `The briefing could not be generated (${status}).` };
  }
  return { ...base, ...empty, outcome: "unexpected_error", message: `Unexpected status "${status}".` };
}

export async function runInvestigation(input: Input): Promise<SectorResult> {
  try {
    const state = await investigationGraph.invoke(input);
    return toSectorResult(input, state);
  } catch (err) {
    console.error(`[${input.symbol}] graph crashed:`, err);
    return toSectorResult(input, undefined, err);
  }
}