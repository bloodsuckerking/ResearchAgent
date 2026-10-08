import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "../client";
import { users, type User } from "../schema/users";

export const LOCAL_OWNER_ID = "local-owner";

export async function getUserById(id: string): Promise<User | undefined> {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .get();
}

async function getExistingAdmin(): Promise<User | undefined> {
  return db.select().from(users).where(eq(users.isAdmin, true)).get();
}

export async function ensureLocalOwner(): Promise<User> {
  const existingAdmin = await getExistingAdmin();
  if (existingAdmin) return existingAdmin;

  return db
    .insert(users)
    .values({
      id: LOCAL_OWNER_ID,
      name: "Local owner",
      isAdmin: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { isAdmin: true, updatedAt: new Date() },
    })
    .returning()
    .get();
}

export async function upsertSingleAdmin(data: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const email = data.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);

  if (existing) {
    const updated = db
      .update(users)
      .set({
        email,
        name: data.name,
        passwordHash: data.passwordHash,
        isAdmin: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning()
      .get();
    db.update(users).set({ isAdmin: false }).where(ne(users.id, existing.id)).run();
    return updated;
  }

  const localOwner = await getUserById(LOCAL_OWNER_ID);
  if (localOwner) {
    const updated = db
      .update(users)
      .set({
        email,
        name: data.name,
        passwordHash: data.passwordHash,
        isAdmin: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, localOwner.id))
      .returning()
      .get();
    db.update(users).set({ isAdmin: false }).where(ne(users.id, localOwner.id)).run();
    return updated;
  }

  const userId = randomUUID();
  const created = db
    .insert(users)
    .values({
      id: userId,
      email,
      name: data.name,
      passwordHash: data.passwordHash,
      isAdmin: true,
    })
    .returning()
    .get();
  db.update(users).set({ isAdmin: false }).where(ne(users.id, userId)).run();
  return created;
}

export async function hasAdminUser(): Promise<boolean> {
  const row = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAdmin, true), isNotNull(users.passwordHash)))
    .get();
  return Boolean(row);
}
