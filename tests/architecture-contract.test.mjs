import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("quest attempts are scored from persisted server questions", () => {
  const route = read("app/api/quest/attempt/route.ts");

  assert.match(route, /prisma\.questQuestion\.findFirst/);
  assert.doesNotMatch(route, /const\s*\{[\s\S]*correctAnswer[\s\S]*\}\s*=\s*body/);
});

test("exam answer saves do not reveal correctness during the exam", () => {
  const route = read("app/api/exam/answer/route.ts");

  assert.match(route, /return NextResponse\.json\(\{ ok: true \}\)/);
  assert.doesNotMatch(route, /return NextResponse\.json\(\{ ok: true, isCorrect/);
});

test("tournament review shows full missed-question context", () => {
  const page = read("app/tournament/[sessionId]/page.tsx");

  assert.match(page, /Wrong only/);
  assert.match(page, /\{q\.questionText\}/);
  assert.doesNotMatch(page, /q\.questionText\.slice/);
  assert.doesNotMatch(page, /q\.explanation\.slice/);
});
