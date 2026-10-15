export type Outcome = "stories" | "no_relevant_news" | "news_api_failed" | "llm_failed" | "unexpected_error";

export type NewsStory = {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string; // ISO string
};

export type SectorBriefing = {
  symbol: string;
  sector: string;
  outcome: Outcome;
  headline: string;
  summary: string;
  generatedAt: string;
  stories: NewsStory[];
};

export type NewsResponse = { briefings: SectorBriefing[] };