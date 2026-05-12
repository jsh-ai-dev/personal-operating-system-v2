import { apiFetch, parseErrorMessage } from "@/lib/api/client";

export function getNotesApiBaseUrl(): string {
  return "/api/notes";
}

export type Visibility = "PUBLIC" | "PRIVATE";

export type NoteDto = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  tags: string[];
  bookmarked: boolean;
  /** 서버에 저장된 AI 요약 (없으면 null/undefined) */
  aiSummary?: string | null;
  aiSummaryModelTier?: string | null;
  aiSummaryInputTokens?: number | null;
  aiSummaryOutputTokens?: number | null;
  aiSummaryEstimatedCostUsd?: number | null;
  /** PDF 등 원본 바이트를 서버에 둔 노트 */
  hasStoredFile?: boolean;
  /** 파일 업로드로 만들었을 때 원본 파일명 */
  originalFileName?: string | null;
};

export type NoteListSort = "recent" | "created" | "title" | "relevance";

export type ListNotesParams = {
  keyword?: string;
  bookmarkedOnly?: boolean;
  sort?: NoteListSort;
  /** Spring 기본 0부터 */
  page?: number;
  /** 페이지당 개수 */
  size?: number;
};

export type NotesListPage = {
  notes: NoteDto[];
  /** 0-based */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

function toTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function parseNote(raw: unknown): NoteDto {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid note response");
  }
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    title: String(o.title ?? ""),
    content: String(o.content ?? ""),
    visibility: o.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    tags: toTags(o.tags),
    bookmarked: Boolean(o.bookmarked),
    aiSummary: o.aiSummary != null ? String(o.aiSummary) : null,
    aiSummaryModelTier: o.aiSummaryModelTier != null ? String(o.aiSummaryModelTier) : null,
    aiSummaryInputTokens: o.aiSummaryInputTokens != null ? Number(o.aiSummaryInputTokens) : null,
    aiSummaryOutputTokens: o.aiSummaryOutputTokens != null ? Number(o.aiSummaryOutputTokens) : null,
    aiSummaryEstimatedCostUsd:
      o.aiSummaryEstimatedCostUsd != null ? Number(o.aiSummaryEstimatedCostUsd) : null,
    hasStoredFile: Boolean(o.hasStoredFile),
    originalFileName: o.originalFileName != null ? String(o.originalFileName) : null,
  };
}

function parseIntHeader(headers: Headers, name: string, fallback: number): number {
  const raw = headers.get(name) ?? headers.get(name.toLowerCase());
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolHeader(headers: Headers, name: string): boolean {
  const raw = headers.get(name) ?? headers.get(name.toLowerCase());
  return raw === "true";
}

function parseNotesPageResponse(res: Response, notes: NoteDto[]): NotesListPage {
  const h = res.headers;
  const page = parseIntHeader(h, "x-page", 0);
  const size = parseIntHeader(h, "x-size", 10);
  const totalElements = parseIntHeader(h, "x-total-elements", notes.length);
  const totalPages = Math.max(0, parseIntHeader(h, "x-total-pages", 0));
  return {
    notes,
    page,
    size,
    totalElements,
    totalPages,
    hasPrevious: parseBoolHeader(h, "x-has-previous"),
    hasNext: parseBoolHeader(h, "x-has-next"),
  };
}

export async function fetchNotesList(params: ListNotesParams = {}): Promise<NotesListPage> {
  const sp = new URLSearchParams();
  if (params.keyword?.trim()) sp.set("keyword", params.keyword.trim());
  if (params.bookmarkedOnly) sp.set("bookmarkedOnly", "true");
  if (params.sort) sp.set("sort", params.sort);
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  sp.set("page", String(page));
  sp.set("size", String(size));
  const q = sp.toString();
  const url = `${getNotesApiBaseUrl()}/v1/notes?${q}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid notes list");
  const notes = data.map(parseNote);
  return parseNotesPageResponse(res, notes);
}

export async function fetchNote(id: string): Promise<NoteDto> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}

export type CreateNoteBody = {
  title: string;
  content: string;
  visibility: Visibility;
  tags: string[];
};

export async function createNote(body: CreateNoteBody): Promise<NoteDto> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: body.title,
      content: body.content,
      visibility: body.visibility,
      tags: body.tags,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}

export async function uploadNoteFile(file: File): Promise<NoteDto> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8''|)([^;\n]+)/i.exec(header);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^"(.*)"$/, "$1");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const q = /filename="([^"]+)"/i.exec(header);
  if (q?.[1]) return q[1].trim();
  const plain = /filename=([^;\n]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"(.*)"$/, "$1");
  return null;
}

/** 원본 파일 URL (같은 출처, 쿠키 포함). `inline`이면 브라우저 탭에서 열기에 적합한 응답입니다. */
export type NoteAttachmentDisposition = "attachment" | "inline";

export function getNoteAttachmentUrl(
  id: string,
  disposition: NoteAttachmentDisposition = "attachment",
): string {
  const base = `${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}/download`;
  return disposition === "inline" ? `${base}?inline=true` : base;
}

/** PDF·텍스트 원본을 새 탭에서 연다 (서버는 Content-Disposition: inline). */
export function openNoteAttachmentInNewTab(id: string): void {
  window.open(getNoteAttachmentUrl(id, "inline"), "_blank", "noopener,noreferrer");
}

/** 브라우저에서 원본을 파일로 저장한다 (Content-Disposition: attachment). */
export async function downloadNoteAttachment(id: string): Promise<void> {
  const res = await apiFetch(getNoteAttachmentUrl(id, "attachment"));
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const blob = await res.blob();
  const name = parseFilenameFromContentDisposition(res.headers.get("content-disposition")) ?? `note-${id}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

export type UpdateNoteBody = CreateNoteBody;

export async function updateNote(id: string, body: UpdateNoteBody): Promise<NoteDto> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: body.title,
      content: body.content,
      visibility: body.visibility,
      tags: body.tags,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}

export async function deleteNote(id: string): Promise<void> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}

export async function setBookmark(id: string, bookmarked: boolean): Promise<NoteDto> {
  const path = `${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}/bookmark`;
  const res = await apiFetch(path, { method: bookmarked ? "POST" : "DELETE" });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}

export type SummaryModelTier = "gpt-5-nano" | "gpt-5-mini" | "gpt-5";

export type GenerateSummaryResult = {
  summary: string;
  modelTier: string;
  originalLength: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
};

export async function generateNoteSummary(
  id: string,
  modelTier: SummaryModelTier = "gpt-5-nano",
): Promise<GenerateSummaryResult> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}/summary/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ modelTier }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") throw new Error("Invalid summary response");
  const o = data as Record<string, unknown>;
  return {
    summary: String(o.summary ?? ""),
    modelTier: String(o.modelTier ?? "gpt-5-nano"),
    originalLength: Number(o.originalLength ?? 0),
    inputTokens: o.inputTokens != null ? Number(o.inputTokens) : null,
    outputTokens: o.outputTokens != null ? Number(o.outputTokens) : null,
    estimatedCostUsd: o.estimatedCostUsd != null ? Number(o.estimatedCostUsd) : null,
  };
}

export type SaveNoteSummaryMetadata = {
  modelTier?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
};

export async function saveNoteSummary(
  id: string,
  summary: string,
  metadata: SaveNoteSummaryMetadata = {},
): Promise<NoteDto> {
  const res = await apiFetch(`${getNotesApiBaseUrl()}/v1/notes/${encodeURIComponent(id)}/summary/save`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ summary, ...metadata }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  return parseNote(data);
}
