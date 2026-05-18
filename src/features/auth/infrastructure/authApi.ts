import { parseErrorMessage } from "@/lib/api/parseErrorMessage";

export type AuthUserDto = { id: string; email: string };

/** 로그인/가입 성공 시 본문에는 사용자 정보만 옵니다. JWT는 httpOnly 쿠키로만 전달됩니다. */
export type AuthSessionResponse = {
  user: AuthUserDto;
};

export async function loginRemote(email: string, password: string): Promise<AuthSessionResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<AuthSessionResponse>;
}

export async function loginDemo(): Promise<AuthSessionResponse> {
  const res = await fetch("/api/auth/demo-login", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<AuthSessionResponse>;
}

export async function registerRemote(
  email: string,
  password: string,
): Promise<AuthSessionResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json() as Promise<AuthSessionResponse>;
}
