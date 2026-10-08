import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { ensureLocalOwner } from "@/lib/db/queries/users";
import { adminSessions } from "@/lib/db/schema/sessions";
import { users } from "@/lib/db/schema/users";
import { getAuthMode } from "./mode";

export const SESSION_COOKIE_NAME = "research_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

function toAuthUser(user: {
  id: string;
  email: string | null;
  name: string | null;
}): AuthUser {
  return { id: user.id, email: user.email, name: user.name };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function shouldUseSecureCookie() {
  if (process.env.SESSION_COOKIE_SECURE === "true") return true;
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  db.insert(adminSessions)
    .values({
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    })
    .run();

  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token))).run();
}

async function getSessionUser(token: string): Promise<AuthUser | null> {
  const row = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      tokenHash: adminSessions.tokenHash,
    })
    .from(adminSessions)
    .innerJoin(users, eq(adminSessions.userId, users.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(users.isAdmin, true),
      ),
    )
    .get();

  if (!row) return null;

  try {
    db.update(adminSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(adminSessions.tokenHash, row.tokenHash))
      .run();
  } catch {
    // Session access must not fail because a last-seen update failed.
  }

  return { id: row.id, email: row.email, name: row.name };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    expires: new Date(0),
  });
}

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  if (getAuthMode() === "none") {
    return { ok: true, user: toAuthUser(await ensureLocalOwner()) };
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ code: "unauthorized" }, { status: 401 }),
    };
  }

  const user = await getSessionUser(token);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ code: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, user };
}

export async function getCurrentAdmin(): Promise<AuthUser | null> {
  if (getAuthMode() === "none") {
    return toAuthUser(await ensureLocalOwner());
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionUser(token);
}
