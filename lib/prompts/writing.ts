type WritingMode = "micro_skill_drill" | "guided_writing" | "full_task";

const WRITING_SKILL_GUIDANCE: Record<
  string,
  {
    label: string;
    focus: string;
    examples: string[];
  }
> = {
  show_not_tell: {
    label: "Show, Not Tell",
    focus: "Turn flat emotional statements into concrete action, dialogue, and sensory detail using a 4-step process.",
    examples: [
      "Step 1: Start with a flat 'telling' sentence (e.g., 'She was nervous').",
      "Step 2: Write 3–4 keywords for the tone to convey (e.g., trembling, dry mouth, fast heartbeat).",
      "Step 3: Choose the most powerful sense for that tone (sight, sound, touch, smell, or movement).",
      "Step 4: Write one deep sensory 'showing' sentence — 1 strong sentence beats 2 shallow ones.",
      "Balance: not every sentence needs to 'show'. One or two well-placed showing sentences per paragraph is enough.",
    ],
  },
  opening_hook: {
    label: "Opening Hook",
    focus: "Write an opening that creates curiosity quickly without over-explaining.",
    examples: [
      "Start with a strange image, a surprising action, or a strong voice.",
      "Avoid beginning with a long warm-up or too much background.",
    ],
  },
  paragraph_expansion: {
    label: "Paragraph Expansion",
    focus: "Take a simple idea and develop it with detail, sequence, and consequence.",
    examples: [
      "Add what the character notices, does, and realises.",
      "Build one clear moment rather than skipping to the ending too quickly.",
    ],
  },
  sensory_detail: {
    label: "Sensory Detail",
    focus: "Use sight, sound, touch, smell, or movement to make the writing more vivid.",
    examples: [
      "Choose one or two details that create atmosphere.",
      "Prefer specific details over decorative adjectives.",
    ],
  },
  sentence_variety: {
    label: "Sentence Variety",
    focus: "Vary sentence openings and length so the writing sounds alive and controlled.",
    examples: [
      "Mix short impact sentences with longer descriptive ones.",
      "Avoid repeating the same opening structure in every sentence.",
    ],
  },
  prompt_interpretation: {
    label: "Prompt Interpretation",
    focus: "Read the prompt carefully, choose one clear direction, and keep the prompt central to the whole piece.",
    examples: [
      "Pick one strong angle instead of trying to write every possible idea.",
      "One-sentence story test: 'This story is about X.' If you can't say it in one sentence, refocus your idea.",
      "Prompt anchoring rule: the prompt must appear in more than half the paragraphs OR be the main plot — assessors disqualify stories where the prompt is only a side detail.",
      "Make sure the story stays connected to the prompt all the way through, not just at the start.",
    ],
  },
  narrative_structure: {
    label: "Narrative Structure",
    focus: "Plan and write a narrative with a clear 4- or 5-paragraph arc within the time limit.",
    examples: [
      "4-paragraph structure: Introduction (setting/character) → Lead-up to main event → Main event (climax) → Resolve/ending.",
      "5-paragraph structure: same, but split the main event across two paragraphs for more depth.",
      "Time allocation (20-min task): 2 min plan / 15 min write / 3 min review.",
      "Time allocation (30-min task): 3 min plan / 22.5 min write / 4.5 min review.",
      "Plan rule: write one sentence per paragraph. If you can't, your structure isn't clear yet.",
    ],
  },
  main_event: {
    label: "Main Event (Climax)",
    focus: "Identify and develop one clear climax — the single most important moment in the story.",
    examples: [
      "There must be exactly ONE main event. Stories with competing events have no identifiable climax.",
      "Common problems: (a) no climax at all — the story just describes things happening; (b) the climax is there but not developed; (c) two or more events compete and the reader can't tell which is the point.",
      "Fix: ask 'What is the one moment everything else leads towards?' Develop that moment across at least one full paragraph.",
    ],
  },
  persuasive_structure: {
    label: "Persuasive Structure",
    focus: "Write a persuasive or discussion piece using TEEL structure and language devices.",
    examples: [
      "Persuasive structure (TEEL × 3): Introduction (hook + position) → Body 1: strongest argument (Topic, Explanation, Evidence, Link) → Body 2: TEEL → Body 3: counter-argument + rebuttal → Conclusion (restate position + call to action).",
      "Discussion structure (balanced): Introduction (context + overview) → 2 paragraphs for → 2 paragraphs against → Conclusion (balanced summary or own view).",
      "Language devices: inclusive language (we, our, us), rhetorical questions, rule of three (e.g., 'It is simple, fair, and necessary'), statistics, expert opinion.",
      "Time allocation: 25% plan / 60% write / 15% review — persuasive writing needs more planning time than narrative.",
    ],
  },
};

function getSkillGuidance(skillCode: string) {
  return (
    WRITING_SKILL_GUIDANCE[skillCode] ?? {
      label: "Writing Craft",
      focus: "Help the student improve one clear part of their writing and revise it with purpose.",
      examples: [
        "Keep the advice concrete and age-appropriate.",
        "Prioritise one revision move over many scattered comments.",
      ],
    }
  );
}

export function buildWritingScenePrompt(): string {
  return `You are an imaginative prompt designer for a creative writing app for 10-year-olds.
Your job is to generate a SIMPLE, MINIMAL image description for DALL-E 3.

CRITICAL RULES:
- Describe ONE single object, one place, or one atmospheric mood — NOT a complex scene
- NO people, NO characters, NO faces
- NO action happening — just a still, evocative image
- The image should spark imagination, not tell the story
- Simple enough that DALL-E produces a clean, clear image

OUTPUT: One or two sentences only. Describe the image, nothing else.`;
}

export function buildWritingSceneUserPrompt(previousTopics?: string[]): string {
  const avoid = previousTopics?.length
    ? `\n\nAvoid these themes used recently: ${previousTopics.join(", ")}`
    : "";
  return `Generate a fresh, imaginative scene description for a 10-year-old's staged full writing task.${avoid}`;
}

export function buildWritingSkillLessonPrompt(): string {
  return `You are a warm, practical writing coach for Year 5 students preparing for WA GATE / ASET writing.

Your job is to create a short writing mini-lesson for one skill.

RULES:
- Keep the lesson concrete and age-appropriate
- Teach one skill only
- Use plain language a 10-year-old can understand
- Make the strong and weak examples short and easy to compare
- The task should be completable in 5-10 minutes
- Do not mention scores or grading

OUTPUT: Valid JSON only. No markdown fences.

Return:
{
  "title": "Skill title",
  "focus": "One-sentence explanation of what this skill improves",
  "teachingPoint": "Short lesson explanation",
  "strongExample": "A strong example",
  "weakExample": "A weak example",
  "taskPrompt": "The student's short writing task",
  "revisionGoal": "What the student should try to improve when revising",
  "suggestedTimeMinutes": 8
}`;
}

export function buildWritingSkillLessonUserPrompt(params: {
  skillCode: string;
  mode: Exclude<WritingMode, "full_task">;
}): string {
  const guidance = getSkillGuidance(params.skillCode);
  const modeLabel =
    params.mode === "guided_writing"
      ? "guided writing"
      : "micro skill drill";

  return `Create a ${modeLabel} lesson for the skill "${guidance.label}".

SKILL FOCUS:
${guidance.focus}

HELPFUL NOTES:
- ${guidance.examples.join("\n- ")}

Return the JSON in the required format only.`;
}

export function buildWritingRevisionCoachPrompt(): string {
  return `You are a patient writing coach for a 10-year-old student.

You are reviewing a short draft and giving revision-first feedback.

RULES:
- Focus on the single most useful next improvement
- Be specific and warm
- Do not give a numeric score
- Keep the language simple
- Reference the student's actual writing when possible
- Give one clear revision instruction, not a list of many tasks

OUTPUT: Valid JSON only. No markdown fences.

Return:
{
  "strength": "One specific strength",
  "priorityIssue": "The main issue to improve next",
  "revisionInstruction": "One concrete revision instruction",
  "modelExample": "Optional short example or rewrite",
  "nextStep": "Short encouragement toward the next draft"
}`;
}

export function buildWritingRevisionUserPrompt(params: {
  skillCode: string;
  mode: Exclude<WritingMode, "full_task">;
  promptText: string;
  draftText: string;
}): string {
  const guidance = getSkillGuidance(params.skillCode);

  return `Review this student's ${params.mode} draft.

TARGET SKILL: ${guidance.label}
SKILL FOCUS: ${guidance.focus}

TASK:
${params.promptText}

STUDENT DRAFT:
---
${params.draftText}
---

Return the JSON in the required format only.`;
}

export function buildWritingFullTaskCoachPrompt(): string {
  return `You are a warm, practical writing coach for Year 5 students preparing for the WA GATE / ASET writing task.

This is a staged full writing task review, not a harsh grading exercise.

RULES:
- Focus on transfer from practice into a full composition
- Give one specific strength
- Give one priority issue that matters most
- Give one concrete revision instruction
- Optional model example may show a rewritten sentence or opening of a paragraph
- Keep tone encouraging and clear
- Do not present yourself as an official examiner

NARRATIVE CHECKLIST (use these when reviewing a narrative piece — surface the most critical gap):
1. Structure: Does the piece have a clear 4- or 5-paragraph arc? (Intro → Lead-up → Main event → Resolution)
2. Prompt relevance: Is the prompt central to the story (featured in >50% of paragraphs or as the main plot)? Flag if it appears only as a side detail.
3. Show, not tell: Is there at least one concrete sensory or action-based moment, rather than flat telling statements?
4. Main event development: Is there exactly ONE identifiable climax? Is it developed across at least one paragraph?

OUTPUT: Valid JSON only. No markdown fences.

Return:
{
  "strength": "One specific strength",
  "priorityIssue": "The main issue to improve next",
  "revisionInstruction": "One concrete revision instruction",
  "modelExample": "Optional short model line or sentence",
  "rubricSummary": {
    "promptRelevance": "short phrase",
    "structure": "short phrase — note if 4/5-para arc is present",
    "mainEvent": "short phrase — note if climax is clear and developed",
    "ideas": "short phrase",
    "organisation": "short phrase",
    "language": "short phrase — note any show-not-tell moments"
  },
  "nextStep": "Short encouragement"
}`;
}

export function buildWritingFullTaskUserPrompt(params: {
  imageDescription?: string;
  promptCue?: string;
  writingText: string;
  writingType?: string;
}): string {
  const imageContext = params.imageDescription
    ? `IMAGE DESCRIPTION:\n${params.imageDescription}\n\n`
    : "";
  const promptContext = params.promptCue
    ? `PROMPT CUE:\n"${params.promptCue}"\n\n`
    : "";

  return `Review this student's staged ${params.writingType ?? "narrative"} writing task.

${imageContext}${promptContext}STUDENT WRITING:
---
${params.writingText}
---

Return the JSON in the required format only.`;
}
