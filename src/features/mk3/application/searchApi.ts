export type SearchResult = {
  conversation_id: string;
  title: string;
  model: string;
  created_at: string;
  score: number;
};

export type SearchResponse = {
  results: SearchResult[];
  cost_usd: number;
};

export type IndexResponse = {
  indexed: number;
  skipped: number;
  failed: number;
  total: number;
  cost_usd: number;
};

async function readJsonSafe<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function searchConversations(query: string, limit = 10): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/mk3/v1/search?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<SearchResponse>(res, { results: [], cost_usd: 0 });
}

export async function indexAllConversations(): Promise<IndexResponse> {
  const res = await fetch("/api/mk3/v1/search/index", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<IndexResponse>(res, {
    indexed: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    cost_usd: 0,
  });
}
