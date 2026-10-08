import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "node_modules", "data"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);
const sensitiveFiles = [
  ".env",
  "data/research-agent.sqlite",
  "data/research-agent.sqlite-shm",
  "data/research-agent.sqlite-wal",
];
const secretPatterns = [
  {
    name: "OpenAI-style API key",
    pattern: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "private key block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: "credentialed database URL",
    pattern: /(?:postgres(?:ql)?|mysql|mongodb):\/\/[^:\s/]+:[^@\s/]+@/gi,
  },
  {
    name: "hard-coded Eazo private key",
    pattern: /EAZO_PRIVATE_KEY\s*=\s*["']?[^"'\s#]{16,}/g,
  },
  {
    name: "absolute Windows user path",
    pattern: /[A-Za-z]:\\Users\\[^\\\s]+/g,
  },
  {
    name: "absolute Unix user path",
    pattern: /\/(?:Users|home)\/[^/\s]+/g,
  },
];

function listFilesFromGit() {
  try {
    return execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return null;
  }
}

function walk(directory, relative = "") {
  const files = [];
  for (const entry of readdirSync(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      files.push(...walk(directory, next));
    } else {
      files.push(next);
    }
  }
  return files;
}

const fromGit = listFilesFromGit();
const files = fromGit ?? walk(root);
const issues = [];
const hasGit = existsSync(path.join(root, ".git"));

for (const sensitiveFile of sensitiveFiles) {
  if (!existsSync(path.join(root, sensitiveFile))) continue;
  if (!hasGit) continue;

  const ignored = spawnSync("git", ["check-ignore", "-q", "--", sensitiveFile], {
    cwd: root,
  });
  if (ignored.status !== 0) {
    issues.push(`${sensitiveFile}: local sensitive file is not ignored by Git`);
  }
}

for (const file of files) {
  const safeFile = file.replaceAll("\\", "/");
  if (safeFile === "scripts/check-privacy.mjs") continue;
  if (ignoredDirectories.has(safeFile.split("/")[0])) continue;

  const extension = path.extname(safeFile);
  if (!textExtensions.has(extension)) continue;

  const absolute = path.join(root, file);
  if (!existsSync(absolute) || statSync(absolute).size > 2_000_000) continue;

  const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { name, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        issues.push(`${safeFile}:${index + 1}: ${name}`);
      }
    }
  });
}

if (issues.length === 0) {
  console.log("Privacy check passed: no local secrets or personal paths detected.");
  process.exit(0);
}

console.error("Privacy check failed. Remove or ignore the following entries:");
for (const issue of issues) console.error(`- ${issue}`);
process.exit(1);
