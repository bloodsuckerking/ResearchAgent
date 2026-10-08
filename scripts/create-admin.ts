import { hashPassword } from "@/lib/auth/password";
import { upsertSingleAdmin } from "@/lib/db/queries/users";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email || !password) {
    console.error(
      [
        "Missing administrator credentials.",
        "Set ADMIN_EMAIL and ADMIN_PASSWORD, then run:",
        "  bun run admin:create",
        'Optional: ADMIN_NAME="Your name"',
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("ADMIN_EMAIL must be a valid email address.");
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await upsertSingleAdmin({ email, name, passwordHash });

  console.log(`Administrator ready: ${admin.email} (${admin.id})`);
}

main().catch((error) => {
  console.error("Administrator initialization failed");
  console.error(error);
  process.exitCode = 1;
});
