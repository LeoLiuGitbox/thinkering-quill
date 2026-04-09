# Writing Coaching Implementation Plan

This document translates the updated PRD and DESIGN direction into a minimal implementation plan for the current codebase.

## Goal

Keep the existing objective-question flow intact while changing Writing from:

- image-first prompt generation
- one-shot full composition
- AI scoring + praise/tip

into:

- `micro_skill_drill`
- `guided_writing`
- `full_task`

with a coaching-oriented revision loop.

## Current Code Reality

The current Writing implementation is still built around a one-shot submission model:

- [app/writing/page.tsx](/Users/leo/Project/thinkering_quill/app/writing/page.tsx)
- [app/api/writing/scene/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/scene/route.ts)
- [app/api/writing/submit/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/submit/route.ts)
- [lib/prompts/writing.ts](/Users/leo/Project/thinkering_quill/lib/prompts/writing.ts)
- [prisma/schema.prisma](/Users/leo/Project/thinkering_quill/prisma/schema.prisma)
- [lib/rewards.ts](/Users/leo/Project/thinkering_quill/lib/rewards.ts)

The objective-question flow should remain untouched unless a Writing change explicitly needs shared profile or reward wiring.

## Phase 1: Data Model

### 1. Expand `WritingSession`

File:
- [prisma/schema.prisma](/Users/leo/Project/thinkering_quill/prisma/schema.prisma)

Current problem:
- `WritingSession` only supports image description, one final response, and one feedback JSON blob.

Minimum target shape:
- `sessionMode`
- `targetSkill`
- `promptText`
- `outlineNotes`
- `draftV1`
- `revisionInstruction`
- `draftV2`
- `feedbackSummaryJson`
- `writingType`
- optional `imageDescription`
- optional `imagePath`

Recommended changes:
- Keep old fields only if needed for backward compatibility
- Add explicit fields for coaching flow rather than reusing `userResponse` for everything

Suggested task breakdown:
1. Add new Prisma fields to `WritingSession`
2. Decide whether old `userResponse` / `feedbackJson` stay temporarily
3. Regenerate Prisma client
4. Add a migration path for existing local SQLite data if needed

## Phase 2: Prompt Layer

### 2. Replace scoring-first prompt design

File:
- [lib/prompts/writing.ts](/Users/leo/Project/thinkering_quill/lib/prompts/writing.ts)

Current problem:
- Prompt builders are built for image generation plus 7-dimension scoring

New prompt builders needed:
- `buildWritingSkillLessonPrompt`
- `buildWritingSkillLessonUserPrompt`
- `buildWritingRevisionCoachPrompt`
- `buildWritingRevisionUserPrompt`
- `buildWritingFullTaskCoachPrompt`
- `buildWritingFullTaskUserPrompt`

Keep but narrow:
- `buildWritingScenePrompt`
- `buildWritingSceneUserPrompt`

Rules:
- Scene prompts should only be used for `full_task`
- Default feedback should be:
  - one strength
  - one priority issue
  - one revision instruction
  - optional model example
- Full-task review may still include rubric flavour, but it should not drive the entire module

Suggested task breakdown:
1. Add coaching prompt builders
2. Downgrade current scoring prompt to `full_task` use only
3. Remove assumptions that every writing session has an image

## Phase 3: API Layer

### 3. Add new Writing endpoints

Files:
- [app/api/writing/scene/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/scene/route.ts)
- [app/api/writing/submit/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/submit/route.ts)

New routes to add:
- `app/api/writing/lesson/route.ts`
- `app/api/writing/exercise/route.ts`
- optional `app/api/writing/revise/route.ts`

Target responsibilities:

`/api/writing/lesson`
- input: `profileId`, `skillCode`, `mode`
- output:
  - lesson goal
  - rule / mini explanation
  - strong example
  - weak example
  - short task
  - newly created `WritingSession`

`/api/writing/exercise`
- input:
  - `profileId`
  - `sessionId`
  - `draftText`
  - `mode`
- output:
  - one strength
  - one priority issue
  - one revision instruction
  - optional model example

`/api/writing/submit`
- repurpose as `full_task` final review
- keep image-aware path only here

`/api/writing/scene`
- keep only for `full_task`
- no longer use as the default writing entry point

Suggested task breakdown:
1. Add `lesson` route
2. Add `exercise` route
3. Restrict `scene` route to `full_task`
4. Refactor `submit` route so it only handles staged full compositions

## Phase 4: Writing UI Flow

### 4. Replace the one-shot page flow

File:
- [app/writing/page.tsx](/Users/leo/Project/thinkering_quill/app/writing/page.tsx)

Current problem:
- The page assumes:
  - setup
  - generate scene
  - write full piece
  - submit
  - receive scored feedback

Target phase model:
- `mode_select`
- `lesson`
- `draft_1`
- `revision_feedback`
- `draft_2`
- `complete`
- `full_task` can still use a longer variant of this flow

Minimum UI changes:
- replace the opening card with a mode selector:
  - `Quick Skill Drill`
  - `Guided Writing`
  - `Full Writing Task`
- only `Full Writing Task` should request a generated scene image
- show draft comparison for coaching modes
- make revision a first-class step instead of a suggestion at the end

Suggested task breakdown:
1. Replace current `phase` union
2. Add mode select UI
3. Add lesson render block
4. Add draft v1 entry
5. Add revision feedback panel
6. Add draft v2 resubmission
7. Keep a separate branch for `full_task`

## Phase 5: Types and Feedback Contracts

### 5. Define new client-side interfaces

Primary file:
- [app/writing/page.tsx](/Users/leo/Project/thinkering_quill/app/writing/page.tsx)

Optional extraction target:
- `types/writing.ts`

Current problem:
- `WritingFeedback` is hard-coded around rubric scores

New interfaces needed:
- `WritingMode`
- `WritingSkillCode`
- `WritingLessonPayload`
- `WritingCoachingFeedback`
- `WritingFullTaskFeedback`

Recommended feedback contract:
```ts
type WritingCoachingFeedback = {
  strength: string;
  priorityIssue: string;
  revisionInstruction: string;
  modelExample?: string;
  sparksEarned?: number;
};
```

Suggested task breakdown:
1. Create shared Writing types
2. Replace page-local score-oriented typing
3. Use stricter response parsing in writing APIs

## Phase 6: Rewards and Progress

### 6. Stop treating Writing as one final score event

Files:
- [lib/rewards.ts](/Users/leo/Project/thinkering_quill/lib/rewards.ts)
- [lib/progression.ts](/Users/leo/Project/thinkering_quill/lib/progression.ts)

Current problem:
- Writing rewards assume a single evaluated composition

Target direction:
- small reward for finishing a drill
- extra reward for completing revision
- larger reward for completing a `full_task`
- optional `attrCraft` growth should reflect persistence and revision, not only score

Suggested task breakdown:
1. Add `calculateWritingDrillSparks`
2. Add `calculateWritingRevisionSparks`
3. Add `calculateWritingFullTaskSparks`
4. Make sure `DailyActivity.writingCount` still updates correctly

## Phase 7: Session Utilities

### 7. Review persistence assumptions

Files:
- [lib/session.ts](/Users/leo/Project/thinkering_quill/lib/session.ts)
- [app/writing/page.tsx](/Users/leo/Project/thinkering_quill/app/writing/page.tsx)

Current problem:
- the page uses localStorage autosave for a single draft

Target direction:
- preserve draft v1 and draft v2 separately
- keep local autosave for safety
- persist key revision milestones to the database

Suggested task breakdown:
1. Rename or split local draft keys
2. Store `draftV1` before revision
3. Store `draftV2` after rewrite
4. Avoid overwriting a full-task draft with drill-mode text

## Phase 8: Out of Scope for the First Pass

Do not mix these into the first Writing refactor:

- K12 writing skill graph integration
- full multi-draft portfolio views
- teacher dashboard features
- automated long-term writing mastery modelling
- broad rewrite of QR / AR / RC logic

## File-by-File Priority Order

1. [lib/prompts/writing.ts](/Users/leo/Project/thinkering_quill/lib/prompts/writing.ts)
2. [prisma/schema.prisma](/Users/leo/Project/thinkering_quill/prisma/schema.prisma)
3. `app/api/writing/lesson/route.ts` (new)
4. `app/api/writing/exercise/route.ts` (new)
5. [app/api/writing/scene/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/scene/route.ts)
6. [app/api/writing/submit/route.ts](/Users/leo/Project/thinkering_quill/app/api/writing/submit/route.ts)
7. [app/writing/page.tsx](/Users/leo/Project/thinkering_quill/app/writing/page.tsx)
8. [lib/rewards.ts](/Users/leo/Project/thinkering_quill/lib/rewards.ts)
9. [lib/progression.ts](/Users/leo/Project/thinkering_quill/lib/progression.ts)

## Done Criteria

The Writing refactor is minimally successful when:

1. A student can start a `micro_skill_drill` without image generation
2. A student can submit draft v1 and receive one concrete revision instruction
3. A student can produce draft v2 in the same session
4. `guided_writing` works without the old full-task timer assumptions
5. `full_task` still exists for staged ASET-style composition practice
6. Objective-question flows remain unchanged
