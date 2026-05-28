import { apiFetch, getApiBaseUrl, parseErrorMessage } from "@/lib/api/client";

export type CalendarChecklistItemDto = {
  id: string;
  title: string;
  isChecked: boolean;
};

export type CalendarChecklistDto = {
  dateKey: string;
  todayKey: string;
  editable: boolean;
  isFuture: boolean;
  startedOn: string | null;
  items: CalendarChecklistItemDto[];
};

export async function fetchChecklist(dateKey: string): Promise<CalendarChecklistDto> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/calendar-checklists/${encodeURIComponent(dateKey)}`,
  );
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<CalendarChecklistDto>;
}

export async function replaceChecklistRemote(
  dateKey: string,
  items: Array<{ id?: string; title: string; isChecked: boolean }>,
): Promise<CalendarChecklistDto> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/calendar-checklists/${encodeURIComponent(dateKey)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  );
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<CalendarChecklistDto>;
}
