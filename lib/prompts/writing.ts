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
  idea_generation: {
    label: "Fresh Ideas",
    focus: "Avoid the obvious angle — find a specific, surprising idea that will make your writing stand out.",
    examples: [
      "Avoid the 3 most obvious interpretations: if the prompt is 'a storm', don't write about rain ruining a picnic or a thunderstorm at night. Ask: what's the angle no one else will take?",
      "'What would surprise the reader?' test: choose an idea that is unexpected but still makes sense for the prompt.",
      "Concrete beats vague: a small specific idea (a boy who repairs clocks for a living discovers one clock that runs backwards) beats a big fuzzy idea ('a magical adventure').",
      "One strong angle rule: lock in ONE idea before you write. Trying to merge two ideas mid-story creates confusion for the reader and the writer.",
      "ASET markers reward complexity, freshness, and originality of ideas — this is one of the 7 marking dimensions.",
    ],
  },
  voice_and_tone: {
    label: "Voice & Tone",
    focus: "Maintain a consistent narrator voice and emotional register throughout your piece.",
    examples: [
      "Choose your narrator position before you write and keep it: first person ('I') for closeness, third person close ('She felt…') for flexibility — don't switch.",
      "Your tone should match your story's mood. If your opening is tense and serious, don't drop into comedy mid-paragraph unless it's intentional.",
      "Avoid over-formal language in dialogue or thought ('She cogitated upon the matter') — keep it natural for a 10-year-old narrator's voice.",
      "Read your writing aloud: if it sounds like a different person wrote each paragraph, your voice has drifted.",
      "ASET markers look for 'distinctiveness of voice and tone' as a separate criterion — a consistent, clear voice is rewarded.",
    ],
  },
  word_choice: {
    label: "Word Choice",
    focus: "Replace weak or repeated words with precise, expressive alternatives that do more work.",
    examples: [
      "Strong verbs beat adverbs: 'sprinted', 'crept', 'lunged' beat 'ran quickly', 'walked slowly', 'moved fast'.",
      "Specific nouns beat generic ones: 'labrador', 'cello', 'sandstone wall' create a sharper image than 'dog', 'instrument', 'wall'.",
      "Avoid repeating the same word in a paragraph — if you've used 'dark' once, try 'shadowed', 'dim', 'murky' next time.",
      "Cut filler words: 'very', 'really', 'quite', 'suddenly' often weaken a sentence. Remove them and see if the sentence is stronger.",
      "ASET rewards 'appropriateness, expressiveness, and fluency of language' — precise word choices are the fastest way to improve this score.",
    ],
  },
  dialogue: {
    label: "Dialogue",
    focus: "Write dialogue that reveals character or advances the plot — not just conversation for its own sake.",
    examples: [
      "Every line of dialogue should do at least one job: reveal character, move the plot forward, or create tension. If it does none of these, cut it.",
      "Less is more: one strong exchange of 2–4 lines beats a page of conversation. Examiners mark writing quality, not word count.",
      "Format rules: start a new paragraph for each speaker; put punctuation inside the closing quotation mark; use a dialogue tag or action beat on the same line.",
      "Show character through HOW they speak, not what they say: short snappy replies vs. long winding sentences tells us more than the actual words.",
      "Avoid dialogue tags like 'exclaimed happily' or 'shouted angrily' — the words themselves should convey the emotion.",
    ],
  },
  // ExamSuccess WR domain — persuasive writing framework
  teel_framework: {
    label: "TEEL Paragraph",
    focus: "Write one argument paragraph using the 4-part TEEL structure.",
    examples: [
      "T — Topic/Claim: State the argument in one clear sentence.",
      "E — Explanation: Explain WHY the claim is true — don't just restate it in different words.",
      "E — Example/Evidence: Give one specific, directly related piece of evidence (historical, comparative, statistical, expert, personal, or hypothetical).",
      "L — Link back: One sentence connecting back to your main stance.",
      "Quality test for evidence: Is it relevant? Specific? Directly related? Distinct from the explanation?",
      "Common mistake: restating the topic sentence as the explanation — if you could swap them, neither is doing its job.",
    ],
  },
  argument_dimensions: {
    label: "3-Dimension Arguments",
    focus: "Generate strong, varied arguments using the Individual / Social / Broader framework.",
    examples: [
      "Individual dimension: How does this affect ONE person? (health, emotions, personal rights, finances)",
      "Social/Community dimension: How does this affect groups, communities, or society as a whole?",
      "Broader dimension: How does this affect the environment, economy, nation, or the wider world?",
      "Strategy: Generate one argument per dimension first, then pick the TWO strongest for your essay — this gives you variety and avoids writing two arguments that are essentially the same idea.",
      "Example topic 'school uniforms': Individual (saves families money), Social (reduces visible wealth gaps between students), Broader (textile industry impact on environment).",
    ],
  },
  counter_argument: {
    label: "Counter-Argument",
    focus: "Acknowledge the opposing view and rebut it in exactly 2 sentences.",
    examples: [
      "Sentence 1: State the opposing argument FAIRLY — ('Some people argue that...' / 'Opponents claim that...').",
      "Sentence 2: Directly rebut it with a reason ('However, this ignores...' / 'Despite this, evidence shows...' / 'While this may be true in some cases, ...').",
      "Only include a counter-argument if you can rebut it strongly — a weak rebuttal is worse than no counter-argument at all.",
      "Position in essay: after your two main TEEL arguments, before the conclusion.",
    ],
  },
  writing_time_plan: {
    label: "Time Management",
    focus: "Use the 25–60–15 rule to plan, write, and review within the exam time limit.",
    examples: [
      "25% Plan: Choose arguments / story arc. Write one sentence per paragraph. If you can't summarise each paragraph in one sentence, your structure isn't clear yet.",
      "60% Write: Execute your plan paragraph by paragraph — don't deviate from your plan mid-way.",
      "15% Review: Check expression and word choice only. Do NOT rewrite whole paragraphs — you won't have time.",
      "For a 25-min exam: ~6 min plan / ~15 min write / ~4 min review.",
      "For a 30-min exam: ~7.5 min plan / ~18 min write / ~4.5 min review.",
      "Planning rule: the plan must be done before you write word one of the essay — not during.",
    ],
  },
  prompt_analysis: {
    label: "Prompt Analysis",
    focus: "Analyse any writing prompt in 4 steps before writing a single word.",
    examples: [
      "Step 1: Read the prompt carefully and circle the key words.",
      "Step 2: Identify the question type — is it persuasive (argue one side) or discussion (explore both sides equally)?",
      "Step 3: Rephrase the prompt in your own plain words.",
      "Step 4: Verify your rephrasing matches the original — if they mean different things, reread.",
      "For difficult/abstract prompts (e.g. proverbs like 'actions speak louder than words'): rephrase into a plain claim first ('What you do matters more than what you say'), then apply 3-Dimension framework.",
      "For uncommon topics (AI, cloning, self-driving cars): use the 3-Dimension framework to generate arguments you already know — the topic is new but the framework still works.",
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
- Prefer a concrete story background, scene, or situation over a generic instruction
- Make the task prompt feel like a real moment the student can step into

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
  "suggestedTimeMinutes": 8,
  "scaffoldNotes": []
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

  const scaffoldInstruction =
    params.mode === "guided_writing"
      ? `
SCAFFOLD NOTES (required for guided writing):
Set "scaffoldNotes" to an array of 3–4 short planning steps the student should follow BEFORE writing.
Each step should be one sentence starting with an action verb (e.g. "Choose...", "Write...", "Decide...").
These steps guide the student through planning their paragraph or section, not just the skill itself.
Example format: ["Decide on the emotion or tone you want to create.", "Choose one moment that shows this — not a summary, one scene.", "Write a topic sentence that sets up the moment.", "Expand with two or three details using this skill."]`
      : `
Set "scaffoldNotes" to an empty array [].`;

  return `Create a ${modeLabel} lesson for the skill "${guidance.label}".

SKILL FOCUS:
${guidance.focus}

HELPFUL NOTES:
- ${guidance.examples.join("\n- ")}
- Give the student a specific topic, setting, or story situation, not a vague "write about..." task
- Make the prompt easy to imagine visually so the student's writing can fit the topic naturally
${scaffoldInstruction}

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
  "quotedOriginalSnippet": "A short exact quote from the student's draft that needs attention",
  "revisedSnippet": "A stronger replacement for that exact quote",
  "topicConnection": "One sentence explaining how the revision better matches the task topic",
  "modelExample": "Optional short example or rewrite",
  "nextStep": "Short encouragement toward the next draft",
  "improvedDraft": "A close revision of the student's draft with more accurate, vivid, and imaginative wording that still sounds like the student's idea"
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

IMPORTANT:
- The feedback must clearly connect to the TASK topic, not just the writing skill in general
- Quote one exact short snippet from the student's draft in "quotedOriginalSnippet"
- Return a better version of that same snippet in "revisedSnippet"
- In "topicConnection", explain how the revision fits the task topic or scene more clearly
- Return an "improvedDraft" that keeps the student's core idea and overall structure, but uses more accurate, vivid, and creative wording
- Make enough changes to give the student inspiration, not just tiny corrections
- Improve clarity, imagery, and word choice before fixing every small grammar issue
- Do NOT rewrite the whole piece in a new voice
- Keep the draft recognisably connected to the student's version, but do not be afraid to strengthen weak or flat phrases

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
