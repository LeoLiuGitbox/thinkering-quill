# Thinkering Quill — System Design

## Current Architecture

Thinkering Quill is a local-first WA GATE / ASET preparation app built with:

| Layer | Current choice |
|---|---|
| App framework | Next.js 16 App Router |
| UI | React 19 client pages and shared components |
| Data access | Prisma 7 generated client with libSQL adapter |
| Storage | Local SQLite database, configured by `DATABASE_URL` |
| AI providers | Gemini for most generation/coaching flows, with Anthropic/OpenAI helpers retained for selected features |
| Styling | Tailwind CSS 4 plus app-specific global styles |

The app is designed for a home/local computer workflow. It is not a public multi-tenant SaaS architecture. Profile selection is intentionally lightweight and still uses local browser state, but server routes must not trust answer correctness, session ownership, or score-affecting fields supplied by the client.

## Product Modules

The product has four learning areas:

| Area | App module |
|---|---|
| Quantitative Reasoning | Quest practice, tournament sections, mastery tracking |
| Abstract Reasoning | Quest practice, AR grid/static SVG rendering, tournament sections |
| Reading Comprehension | Passage-based quest practice and tournament sections |
| Writing | Coaching-oriented drills, guided writing, staged full tasks |

Writing is not treated as an authoritative automatic marking system. It uses AI for scaffolding, examples, feedback wording, revision prompts, and progress signals.

## Data Model

Core Prisma models:

- `Profile`: local child profile, XP, rank, aura, attributes, preferences.
- `QuestSession`: one practice session in a region.
- `QuestQuestion`: generated question snapshot for a quest session. This is the source of truth for correct answers during submission.
- `QuizAttempt`: a submitted or skipped answer attempt, including the answer, correctness, timing, hints, explanation, and review data.
- `ExamSession` / `ExamQuestion`: tournament session and generated exam questions.
- `WritingSession` / `WritingSkillProgress`: writing coaching state and skill growth.
- `KnowledgeMastery`, `SubjectStat`, `DailyActivity`: learning analytics.
- `Badge`, `Artifact`, `ProfileArtifact`: reward system.
- `IntegrityEvent`: local integrity signals and recovery flow.
- `AppSettings`: experimental/local settings. Runtime AI keys should still be treated as server-side configuration.

The active local database is selected by `DATABASE_URL`. A typical local value is:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

## Trust Boundaries

This is a local-first app, but score-affecting data must still be server-owned:

- Quest generation persists every generated question in `QuestQuestion`.
- Quest submission accepts only question identity, student answer, and telemetry.
- Correctness, XP, mastery, attributes, and review data are computed from persisted server data.
- Exam answer saves do not return immediate correctness.
- Exam review exposes correct answers and explanations only after completion.
- Route handlers must verify resource ownership where a profile/session relationship exists.

The app does not currently implement password login, account auth, or public deployment authorization. If the app is later exposed beyond a trusted local machine, a real cookie/session auth layer must be added before deployment.

## Review Experience

Review is a learning surface, not only an answer key.

Quest and tournament review screens must show missed questions with:

- full question text;
- passage/context when present;
- all options;
- student's answer or `Skipped`;
- correct answer;
- explanation;
- relevant knowledge point or skill signal when available.

Default review mode should prioritize missed questions. An all-question view can remain available for broader review.

## AI Output Handling

AI-generated content should be treated as untrusted structured input:

- Parse JSON defensively.
- Validate required fields before saving generated questions or writing feedback.
- Retry once when generated JSON is malformed or incomplete.
- Do not save malformed generated content into the learning record.

Quest and exam generation should share the same WA GATE taxonomy where practical so practice, tournament review, and mastery reports remain aligned.

## Development

Common commands:

```bash
npm run dev
npm run typecheck
npm run test
npm run build
npm run check
npm run db:migrate
npm run db:seed
```

`_python_archive/` contains historical Flask-era work only. It is not the current application architecture.
