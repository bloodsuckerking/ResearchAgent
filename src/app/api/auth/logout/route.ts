import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  deleteSession,
  getAuthMode,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (getAuthMode() === "none") {
    return NextResponse.json({ ok: true, auth_mode: "none" });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await deleteSession(token).catch(() => undefined);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
