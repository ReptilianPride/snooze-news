// Types for state

export type NewsResult = {
    title: string;
    url:string;
    source:string;
    publishedAt:string;
    snippet:string;
};

export type Evidence = {
    title: string;
    url: string;
    relevance: number;
    supportsAnomaly: boolean;
    reason: string;
};