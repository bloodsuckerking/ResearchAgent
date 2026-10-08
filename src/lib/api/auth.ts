import { request } from "./request";

type ErrorBody = { code?: string };

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  return new Error(body?.code ?? fallback);
}

export async function loginAdmin(email: string, password: string): Promise<void> {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await readError(response, "login_failed");
}

export async function logoutAdmin(): Promise<void> {
  const response = await request("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw await readError(response, "logout_failed");
}
