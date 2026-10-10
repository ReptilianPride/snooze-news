export type NewsResult = {
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    snippet: string;
};

export type Evidence = {
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    snippet: string;
    relevance: number;
    sectorRelevance: boolean;
    reason: string;
};

export type FinalStory = {
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    summary: string;
};

export type FinalExplanation = {
    headline: string;
    summary: string;
    stories: FinalStory[];
};