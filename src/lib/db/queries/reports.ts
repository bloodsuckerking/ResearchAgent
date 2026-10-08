import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { reports, type ResearchSnapshot } from "../schema/reports";

export async function saveReport(
  userId: string,
  query: string,
  snapshot: ResearchSnapshot,
) {
  const id = randomUUID();
  db.insert(reports)
    .values({
      id,
      userId,
      query,
      title: snapshot.report.title,
      snapshot,
    })
    .run();
  return id;
}

export function listReports(userId: string) {
  return db
    .select({
      id: reports.id,
      title: reports.title,
      query: reports.query,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(100)
    .all();
}

export function getReport(userId: string, id: string) {
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.userId, userId), eq(reports.id, id)))
    .get();
}

export async function deleteReport(userId: string, id: string) {
  const rows = db
    .delete(reports)
    .where(and(eq(reports.userId, userId), eq(reports.id, id)))
    .returning({ id: reports.id })
    .all();
  return rows.length > 0;
}
