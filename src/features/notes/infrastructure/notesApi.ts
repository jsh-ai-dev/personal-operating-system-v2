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
};

export type NoteListSort = "recent" | "title" | "relevance";

export type ListNotesParams = {
  keyword?: string;
  bookmarkedOnly?: boolean;
  sort?: NoteListSort;
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
  };
}

export async function fetchNotesList(params: ListNotesParams = {}): Promise<NoteDto[]> {
  const sp = new URLSearchParams();
  if (params.keyword?.trim()) sp.set("keyword", params.keyword.trim());
  if (params.bookmarkedOnly) sp.set("bookmarkedOnly", "true");
  if (params.sort) sp.set("sort", params.sort);
  const q = sp.toString();
  const url = `${getNotesApiBaseUrl()}/v1/notes${q ? `?${q}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid notes list");
  return data.map(parseNote);
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
