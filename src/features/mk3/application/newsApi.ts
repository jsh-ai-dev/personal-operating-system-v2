export type NewsModel = {
  id: string;
  input_per_1m: number;
  output_per_1m: number;
};

export type ArticleAnalysis = {
  summary: string;
  keywords: { keyword: string; explanation: string }[];
  motivation_summary: string;
  questions: { question: string; expected_answer: string }[];
  analyzed_at: string;
  analysis_model: string;
  analysis_cost_usd: number;
};

export type Article = {
  id: string;
  date: string;
  page_num: number;
  title: string;
  url: string;
  content: string;
  companies: string[];
  tags: string[];
  scraped_at: string;
  analysis: ArticleAnalysis | null;
};

export type NewsScrapeJob = {
  id: string;
  date: string;
  status: "queued" | "running" | "completed" | "limited" | "failed";
  total: number;
  processed: number;
  inserted: number;
  skipped_existing: number;
  failed: number;
  message: string;
  last_error: string;
  current_url: string;
  created_at: string;
  updated_at: string;
  started_at: string;
  finished_at: string;
  cooldown_until: string;
};

async function readJsonSafe<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function parseDetail(res: Response): Promise<string> {
  const json = await readJsonSafe<{ detail?: string; message?: string }>(res, {});
  return json.detail ?? json.message ?? `HTTP ${res.status}`;
}

export async function scrapeNews(date: string): Promise<{ articles: Article[]; new_count: number; job: NewsScrapeJob; started: boolean }> {
  const res = await fetch("/api/mk3/v1/news/scrape", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<{ articles: Article[]; new_count: number; job: NewsScrapeJob; started: boolean }>(
    res,
    { articles: [], new_count: 0, job: {} as NewsScrapeJob, started: false },
  );
}

export async function getNewsScrapeJob(id: string): Promise<NewsScrapeJob> {
  const res = await fetch(`/api/mk3/v1/news/scrape/jobs/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<NewsScrapeJob>(res, {} as NewsScrapeJob);
}

export async function getLatestNewsScrapeJob(date: string): Promise<NewsScrapeJob | null> {
  const qs = new URLSearchParams({ date });
  const res = await fetch(`/api/mk3/v1/news/scrape/jobs/latest?${qs.toString()}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<NewsScrapeJob | null>(res, null);
}

export async function listNews(params: {
  date?: string;
  company?: string;
  tag?: string;
}): Promise<Article[]> {
  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  if (params.company) qs.set("company", params.company);
  if (params.tag) qs.set("tag", params.tag);

  const res = await fetch(`/api/mk3/v1/news?${qs.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<Article[]>(res, []);
}

export async function getNewsDates(): Promise<string[]> {
  const res = await fetch("/api/mk3/v1/news/dates", { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<string[]>(res, []);
}

export async function getFilterOptions(): Promise<{ companies: string[]; tags: string[] }> {
  const res = await fetch("/api/mk3/v1/news/filter-options", { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe(res, { companies: [], tags: [] });
}

export async function getNewsModels(): Promise<NewsModel[]> {
  const res = await fetch("/api/mk3/v1/news/models", { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<NewsModel[]>(res, []);
}

export async function getNews(id: string): Promise<Article> {
  const res = await fetch(`/api/mk3/v1/news/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<Article>(res, {} as Article);
}

export async function analyzeNews(id: string, model: string): Promise<Article> {
  const res = await fetch(`/api/mk3/v1/news/${id}/analyze`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error(await parseDetail(res));
  return readJsonSafe<Article>(res, {} as Article);
}
