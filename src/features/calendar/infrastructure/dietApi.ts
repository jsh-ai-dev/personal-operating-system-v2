import { parseErrorMessage } from "@/lib/api/parseErrorMessage";

export type NutrientsDto = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
};

export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

export type MealSummaryDto = {
  label: string;
  items: string[];
  nutrients: NutrientsDto;
};

export type DietMessageDto = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
};

export type DietDayDto = {
  date_key: string;
  meals: Record<MealKey, MealSummaryDto>;
  total: NutrientsDto;
  tip: string;
  sources: string[];
  messages: DietMessageDto[];
  updated_at: string | null;
};

export type DietProfileDto = {
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  daily_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  updated_at: string | null;
};

export type AnalyzeDietResponse = {
  day: DietDayDto;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
};

const emptyNutrients = (): NutrientsDto => ({
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  sugar_g: 0,
});

export const emptyDietProfile = (): DietProfileDto => ({
  current_weight_kg: null,
  target_weight_kg: null,
  daily_calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  updated_at: null,
});

export const emptyDietDay = (dateKey: string): DietDayDto => ({
  date_key: dateKey,
  meals: {
    breakfast: { label: "아침", items: [], nutrients: emptyNutrients() },
    lunch: { label: "점심", items: [], nutrients: emptyNutrients() },
    dinner: { label: "저녁", items: [], nutrients: emptyNutrients() },
    snack: { label: "간식", items: [], nutrients: emptyNutrients() },
  },
  total: emptyNutrients(),
  tip: "",
  sources: [],
  messages: [],
  updated_at: null,
});

async function readJsonSafe<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  let message = "";
  try {
    const body: unknown = await res.clone().json();
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      message = Array.isArray(detail) ? detail.map(String).join(", ") : String(detail);
    }
  } catch {
    message = "";
  }
  if (!message) message = await parseErrorMessage(res);
  throw new Error(message || `HTTP ${res.status}`);
}

export async function fetchDietProfile(): Promise<DietProfileDto> {
  const res = await fetch("/api/mk3/v1/diet/profile", { credentials: "include" });
  await throwIfNotOk(res);
  return readJsonSafe<DietProfileDto>(res, emptyDietProfile());
}

export async function saveDietProfile(profile: DietProfileDto): Promise<DietProfileDto> {
  const res = await fetch("/api/mk3/v1/diet/profile", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  await throwIfNotOk(res);
  return readJsonSafe<DietProfileDto>(res, emptyDietProfile());
}

export async function fetchDietDay(dateKey: string): Promise<DietDayDto> {
  const res = await fetch(`/api/mk3/v1/diet/days/${dateKey}`, { credentials: "include" });
  await throwIfNotOk(res);
  return readJsonSafe<DietDayDto>(res, emptyDietDay(dateKey));
}

export async function analyzeDietDay(
  dateKey: string,
  message: string,
  model = "gpt-5-nano",
): Promise<AnalyzeDietResponse> {
  const res = await fetch(`/api/mk3/v1/diet/days/${dateKey}/analyze`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model }),
  });
  await throwIfNotOk(res);
  return readJsonSafe<AnalyzeDietResponse>(res, {
    day: emptyDietDay(dateKey),
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
  });
}
