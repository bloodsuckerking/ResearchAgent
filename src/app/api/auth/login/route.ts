import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getAuthMode, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/auth/password";
import { getUserByEmail, hasAdminUser } from "@/lib/db/queries/users";

export const runtime = "nodejs";

const inputSchema = z.object({
  email: z.string().trim().email().max(256),
  password: z.string().min(1).max(1_024),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function attemptKey(request: NextRequest, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded || "local"}:${email.toLowerCase()}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  if (getAuthMode() === "none") {
    return NextResponse.json({ code: "auth_disabled" }, { status: 409 });
  }

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 400 });
  }

  const key = attemptKey(request, input.data.email);
  if (isRateLimited(key)) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }

  if (!(await hasAdminUser())) {
    return NextResponse.json({ code: "setup_required" }, { status: 503 });
  }

  const user = await getUserByEmail(input.data.email);
  if (!user?.isAdmin || !user.passwordHash) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(user.passwordHash, input.data.password);
  if (!valid) {
    return NextResponse.json({ code: "invalid_credentials" }, { status: 401 });
  }

  attempts.delete(key);
  const session = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
