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
    focus: "Turn flat emotional statements into concrete action, dialogue, and sensory detail.",
    examples: [
      "Replace 'She was nervous' with body language, thoughts, or dialogue.",
      "Use a precise image or action to let the reader infer the feeling.",
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
    focus: "Read the prompt carefully and choose a direction that can be developed clearly.",
    examples: [
      "Pick one strong angle instead of trying to write every possible idea.",
      "Make sure the story stays connected to the prompt all the way through.",
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

OUTPUT: Valid JSON only. No markdown fences.

Return:
{
  "strength": "One specific strength",
  "priorityIssue": "The main issue to improve next",
  "revisionInstruction": "One concrete revision instruction",
  "modelExample": "Optional short model line or sentence",
  "rubricSummary": {
    "promptRelevance": "short phrase",
    "ideas": "short phrase",
    "organisation": "short phrase",
    "language": "short phrase"
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
