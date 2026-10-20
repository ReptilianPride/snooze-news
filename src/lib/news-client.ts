import type { NewsResponse } from "./news-types";

export async function fetchNews(selection: "ALL" | string): Promise<NewsResponse> {
  const url = selection === "ALL" ? "/api/news" : `/api/news?symbol=${encodeURIComponent(selection)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}