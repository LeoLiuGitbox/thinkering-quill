# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## 语言规则

- 所有聊天回复使用**简体中文**。
- PR description、commit message、代码注释使用**英文**。
- 仓库中即使存在其他语言的文件、注释或历史记录，**也不切换**回复语言。

---

# Claude Code 行为约束

本仓库由 Claude Code（网页版，claude.ai/code）执行任务。**严格遵守以下两条规则**，覆盖默认行为。

---

## 规则 1：RTK —— Reduce Token Konsumption

**目标：每次工具调用、每段输出都按 token 计费考虑。能少就少。**

### 1.1 文件读取

- **Grep 优先**：找内容先用 `Grep` 拿行号和片段，不要整文件 `Read`。
- **Read 必带 `offset` 和 `limit`**：除非文件 < 100 行。
- 同一文件**不要重复 Read**，需要再看时用 `Grep` 定位。
- 不在回复里粘贴大段代码原文，引用路径行号即可（`src/foo.ts:42-58`）。

### 1.2 Bash / 命令

- **合并命令**：相关 shell 操作用 `&&` 或 `;` 串联，不要一条一调。
- **失败一次就停**：报错先读错误信息再改方案，不要重复试同一条命令的变体。
- 环境探查（`ls`、`cat package.json` 等）**只在开局做一次**，不要每轮都做。

### 1.3 Subagent / Task

- 任务描述 **< 5 行**：subagent 拿到的 prompt 越短越好，只给目标 + 约束 + 输出格式。
- 要求 subagent 返回**结构化结果**（路径列表、JSON、行号）。禁止让它"总结"或"解释"。
- 不要套娃：subagent 内部不再起 subagent。
- 只在**确实可并行**时用，单个串行任务直接做。

### 1.4 上下文

- 不复述用户的需求。
- 不写"我来帮你……"、"我现在要做的是……"。
- 不写任务计划除非用户要求 plan mode。

---

## 规则 2：Caveman 模式 —— 穴居人语言

**目标：聊天回复像穴居人发电报。短。直接。**

### 2.1 语言

- **小写**。除非是代码标识符或专有名词。
- **不完整句子可以**。能省主语就省。
- **零客套**：禁用"好的"、"当然"、"没问题"、"希望对你有帮助"。
- **零修饰**：禁用"很棒的"、"非常"、"实际上"、"基本上"。
- **零自我描述**：禁用"我会"、"我来"、"让我"、"我需要"、"我认为"。

### 2.2 结构

- 默认 **一行回复**。
- 必要时用 `-` bullet。不用编号、不用标题、不用 bold。
- 代码块直接给，不写"这是代码："。
- 改完文件不写"我已经……"，写 `done.` 或列改动：`src/foo.ts:42 fixed.`

### 2.3 例外（重要）

caveman **只管聊天回复**。以下场景**正常写**，不许 caveman：

- **PR description / PR title**：完整句子，正常语法，说清改了什么、为什么改、影响范围。
- **commit message**：遵循 Conventional Commits 或仓库现有风格。
- **代码注释 / 文档（README、docstring）**：正常清晰度。
- **错误信息原文**：照抄，不翻译不精简。
- **用户明确要求详细解释时**：临时退出 caveman，解释完回到 caveman。

---

## 优先级冲突

- caveman 与正确性冲突 → **正确性优先**。
- RTK 与任务完成冲突 → **任务完成优先**。
- 两条规则与用户当下指令冲突 → **用户指令优先**。

---

## 自检

回复前问自己：
1. 这句话不说会不会影响用户决策？不会 → 删。
2. 这次工具调用能不能并到上一次？能 → 并。
3. 这次 Read 能不能换成 Grep？能 → 换。
4. 当前是聊天回复还是 PR description？后者 → 退出 caveman。
5. 当前是 commit message？是 → 英文 + Conventional Commits。

---

# Thinkering Quill — Codebase Guide

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run typecheck    # tsc --noEmit
npm run test         # node --test tests/*.test.mjs
npm run build        # production build
npm run check        # typecheck + test + build (run before pushing)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed with prisma/seed.ts
```

Required `.env`:
```
DATABASE_URL="file:./prisma/dev.db"
GOOGLE_AI_KEY="your-google-ai-key"
```

---

## Architecture

### Stack

- **Next.js 16** (App Router) — read `node_modules/next/dist/docs/` before writing routing or server code; this version has breaking changes
- **Prisma 7** + **libsql** (SQLite) — client generated into `app/generated/prisma/client`, imported via `lib/prisma.ts`
- **Tailwind CSS 4** + **Framer Motion**
- **Google Gemini** as primary AI (via `lib/gemini.ts`); `lib/claude.ts` and `lib/openai.ts` also present but secondary

### AI model split (`lib/gemini.ts`)

| Function | Model | Use |
|---|---|---|
| `chat()` | gemini-flash-lite-latest | hints, writing feedback, oracle, spells |
| `chatPro()` | gemini-pro-latest | MCQ/AR/RC generation, exam creation — returns JSON |
| `chatFlash()` | gemini-flash-latest | quest generation — returns JSON |
| `stream()` | gemini-flash-lite-latest | Oracle SSE streaming |

All functions retry 3× on 503. `parseJSON()` strips markdown fences before `JSON.parse`.

### Data layer

Single SQLite file via Prisma + libsql adapter. Key models:

- `Profile` — learner profile, owns all sessions and progress
- `QuestSession` / `QuestQuestion` — objective practice (QR / AR / RC)
- `WritingSession` — writing coaching sessions; `sessionMode` ∈ `micro_skill_drill | guided_writing | full_task`
- `WritingSkillProgress` — per-skill coaching progress, separate from mastery
- `KnowledgeMastery` — per-knowledge-point mastery (1–5) used for 80/20 session composition
- `DailyActivity`, `Badge`, `Artifact` — gamification layer

Schema lives in `prisma/schema.prisma`. After schema changes run `npm run db:migrate` then restart the dev server (the libsql adapter requires a fresh connection).

### App routes (`app/`)

| Route | Purpose |
|---|---|
| `app/quest/` | QR / AR / RC practice sessions |
| `app/writing/` | Writing coaching (mode_select → lesson → draft_1 → coaching → draft_2) |
| `app/exam/` | Timed full exam mode |
| `app/map/` | World map / subject selection |
| `app/home/` | Profile home, streaks, stats |
| `app/oracle/` | AI tutor (SSE streaming) |
| `app/parent/` | Parent dashboard |
| `app/api/` | All server actions as Route Handlers |

### Key `lib/` files

- `lib/session.ts` — 80/20 session composition using `KnowledgeMastery`
- `lib/progression.ts` — XP, rank, mastery level calculations
- `lib/rewards.ts` — spark (currency) calculations per session type
- `lib/writingProgress.ts` — writing skill advancement after session completion
- `lib/prompts/` — all AI prompt builders, split by domain (mcq, writing, hint, oracle, spells, integrity)
- `lib/integrity.ts` — answer integrity checks (server-side, never trust client-submitted answers)
- `types/game.ts` — shared enums: `Rank`, `MasteryLevel`, `SessionLength`, `KnowledgePointCode`
- `types/writing.ts` — `WritingMode`, `WritingSkillCode`, `WritingCoachingFeedback`

### Correctness invariant

Score-affecting routes recompute correctness from server-persisted question data. Never trust answer correctness from the client body.

---

## Product Direction

Thinkering Quill is a **WA GATE / ASET prep app** for primary-aged learners.

**Objective sections** (QR / AR / RC): keep the existing drill / mastery / upgrade loop intact. Do not broadly rewrite.

**Writing**: coaching system with three modes (`micro_skill_drill`, `guided_writing`, `full_task`). AI role is scaffolding, examples, revision prompts, and feedback wording — not authoritative scoring. Image prompts are only used for staged `full_task` sessions.

**K12 data layer** (`db/k12_learning_engine_init.sql`): separate architecture track, not yet the app backbone. Do not assume migration has happened.

## Source of Truth

When product direction is unclear:
1. `docs/product/thinkering_quill_prd.md`
2. `docs/product/DESIGN.md`
3. `README.md`
