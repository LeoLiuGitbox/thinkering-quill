import fs from "fs";
import path from "path";

export type ChallengeLogListItem = {
  fileName: string;
  title: string;
  updatedAt: string;
  sizeBytes: number;
};

function challengeLogDir() {
  return path.join(process.cwd(), "challenge-logs");
}

function isSafeLogFileName(fileName: string) {
  return (
    typeof fileName === "string" &&
    fileName.endsWith(".md") &&
    path.basename(fileName) === fileName
  );
}

function extractTitle(content: string, fallback: string) {
  const firstHeading = content.match(/^#\s+(.+)$/m);
  return firstHeading?.[1]?.trim() || fallback.replace(/\.md$/, "");
}

export function listChallengeLogs(): ChallengeLogListItem[] {
  const dir = challengeLogDir();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const fullPath = path.join(dir, fileName);
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf8");

      return {
        fileName,
        title: extractTitle(content, fileName),
        updatedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readChallengeLog(fileName: string) {
  if (!isSafeLogFileName(fileName)) return null;

  const fullPath = path.join(challengeLogDir(), fileName);
  if (!fs.existsSync(fullPath)) return null;

  return fs.readFileSync(fullPath, "utf8");
}
