import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  deleteReport,
  getReport,
  listReports,
} from "@/lib/db/queries/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(await listReports(auth.user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    }
    const row = await getReport(auth.user.id, id);
    return row
      ? NextResponse.json(row, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ code: "not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ code: "storage_failed" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ code: "invalid" }, { status: 400 });
  }

  try {
    return NextResponse.json({ deleted: await deleteReport(auth.user.id, id!) });
  } catch {
    return NextResponse.json({ code: "storage_failed" }, { status: 503 });
  }
}
