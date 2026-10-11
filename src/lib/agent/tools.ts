import { NewsResult } from "./state-types";

const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/latest";

export async function searchNews(query:string):Promise<NewsResult[]>{
    const apiKey = process.env.NEWSDATA_API_KEY;
    if(!apiKey) throw new Error("NEWSDATA_API_KEY is not set");

    const url = new URL(NEWSDATA_BASE_URL);
    url.searchParams.set("apiKey",apiKey);
    url.searchParams.set("q",query);
    url.searchParams.set("language","en");
    url.searchParams.set("sort","relevancy");
    url.searchParams.set("prioritydomain","top");
    // url.searchParams.set("category","business") //might have to make this dynamic

    const res = await fetch(url.toString());
    if(!res.ok){
        const body = await res.text().catch(()=>"<no body>");
        throw new Error(`Newsdata.io request failed (${res.status}): ${body}`);
    }

    const data = await res.json();

    const results = Array.isArray(data.results) ? data.results : [];

    return results.map((r:any)=>({
        title: r.title ?? "",
        url: r.link ?? "",
        source: r.source_id ?? r.source_name ?? "unknown",
        publishedAt: r.pubDate ?? "",
        snippet: r.description ?? "",
    }));
}