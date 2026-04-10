function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "message" in body) {
      const msg = (body as { message: unknown }).message;
      if (Array.isArray(msg)) return msg.map(String).join(", ");
      if (typeof msg === "string") return msg;
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export type CalendarMemoDto = {
  id: string;
  dateKey: string;
  brief: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchMemosInRange(from: string, to: string): Promise<CalendarMemoDto[]> {
  const url = `${getApiBaseUrl()}/api/memos?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<CalendarMemoDto[]>;
}

export async function upsertMemoRemote(body: {
  dateKey: string;
  brief: string;
  detail: string;
}): Promise<CalendarMemoDto> {
  const res = await fetch(`${getApiBaseUrl()}/api/memos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<CalendarMemoDto>;
}

export async function deleteMemoRemote(dateKey: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/memos/${encodeURIComponent(dateKey)}`, {
    method: "DELETE",
  });
  if (res.status === 204 || res.status === 404) return;
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}
