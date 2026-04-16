import { NextRequest, NextResponse } from "next/server";
import { chat, parseJSON } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import {
  buildWritingSkillLessonPrompt,
  buildWritingSkillLessonUserPrompt,
} from "@/lib/prompts/writing";

type WritingMode = "micro_skill_drill" | "guided_writing";

type LessonPayload = {
  title: string;
  focus: string;
  teachingPoint: string;
  strongExample: string;
  weakExample: string;
  taskPrompt: string;
  revisionGoal: string;
  suggestedTimeMinutes: number;
  scaffoldNotes?: string[];
};

type LessonVariant = {
  strongExample: string;
  weakExample: string;
  taskPrompt: string;
  revisionGoal: string;
  scaffoldNotes: string[];
};

const SHOW_NOT_TELL_VARIANTS: LessonVariant[] = [
  {
    strongExample:
      "Kai pressed both hands against the cold office window as the printer coughed out a single page behind the principal's desk.",
    weakExample: "Kai was nervous while waiting for his test result.",
    taskPrompt:
      "Write 5-7 sentences set outside the principal's office while a student waits to hear whether they made the school robotics team. Do not use the words nervous, scared, happy, or relieved.",
    revisionGoal:
      "Use body language, sound, and one exact object from the office scene to reveal the feeling without naming it.",
    scaffoldNotes: [
      "Start with one body action near the office door or window.",
      "Add one sound, object, or movement from the office area.",
      "End with a reaction that shows what the news means to the student.",
    ],
  },
  {
    strongExample:
      "Lena kept smoothing the crumpled ticket in her pocket while the loudspeaker crackled above the crowded station.",
    weakExample: "Lena was worried while she waited for an announcement.",
    taskPrompt:
      "Write 5-7 sentences at a train station where a student is waiting to hear whether a missing family member has been found. Do not use the words nervous, scared, happy, or relieved.",
    revisionGoal:
      "Make the waiting scene feel real through body actions and one strong station detail instead of naming the emotion.",
    scaffoldNotes: [
      "Place the student in one exact spot in the station.",
      "Use one sound or movement from the station around them.",
      "Finish with a small reaction that reveals the change in feeling.",
    ],
  },
  {
    strongExample:
      "Tara tugged at the frayed sleeve of her costume as footsteps tapped closer to the curtain.",
    weakExample: "Tara felt nervous before the casting result.",
    taskPrompt:
      "Write 5-7 sentences backstage at a school play where a student is waiting to hear who got the lead role. Do not use the words nervous, scared, happy, or relieved.",
    revisionGoal:
      "Show the feeling through costume details, sounds backstage, and the student's reaction when the news arrives.",
    scaffoldNotes: [
      "Open with a hand movement or body action backstage.",
      "Add one prop, costume, or sound from behind the curtain.",
      "Show the reaction in the final sentence without naming the emotion.",
    ],
  },
  {
    strongExample:
      "Mina balanced on the edge of the museum bench, staring at the glass doors every time the intercom clicked alive.",
    weakExample: "Mina was nervous while she waited for important news at the museum.",
    taskPrompt:
      "Write 5-7 sentences in a museum foyer where a student is waiting to hear whether a stolen mammoth clue has been found. Do not use the words nervous, scared, happy, or relieved.",
    revisionGoal:
      "Keep the museum mystery in the background of the scene and reveal the feeling through actions and details.",
    scaffoldNotes: [
      "Start with how the student sits, stands, or moves in the foyer.",
      "Add one sound, light, or object from the museum around them.",
      "End with a reaction that fits the mammoth mystery topic.",
    ],
  },
];

const OPENING_HOOK_VARIANTS: LessonVariant[] = [
  {
    strongExample: "The envelope was already open when Noah found it on his desk.",
    weakExample: "One day Noah went to school and something interesting happened.",
    taskPrompt: "Write three different opening lines for a story about a mystery at school. Choose your strongest one and continue for 4-5 more sentences.",
    revisionGoal: "Make the first line create curiosity straight away and match the mystery-at-school topic.",
    scaffoldNotes: ["Start with the strange detail, not the background.", "Make the reader ask a question immediately.", "Keep the opening linked to the school mystery idea."],
  },
  {
    strongExample: "The camping map was missing the red track, and Zara noticed it first.",
    weakExample: "Last weekend Zara went camping with her family.",
    taskPrompt: "Write three different opening lines for a story about a camping trip where something important has gone missing. Choose your strongest one and continue for 4-5 more sentences.",
    revisionGoal: "Make the first line create tension straight away and keep it connected to the camping problem.",
    scaffoldNotes: ["Begin with the missing item or strange discovery.", "Use one exact detail from the campsite.", "Keep the opening focused on the camping problem."],
  },
  {
    strongExample: "By the time the museum lights flickered back on, the tiny gold compass had vanished.",
    weakExample: "My class went to a museum and it was exciting.",
    taskPrompt: "Write three different opening lines for a story about a museum visit where an object disappears. Choose your strongest one and continue for 4-5 more sentences.",
    revisionGoal: "Make the first line feel unusual straight away and clearly fit the museum topic.",
    scaffoldNotes: ["Start with the disappearance, not the arrival.", "Use one object the reader can picture.", "Keep the first sentence tightly connected to the museum problem."],
  },
  {
    strongExample: "The noticeboard only changed after everyone else had walked out of the hall.",
    weakExample: "There was a school assembly and then something happened.",
    taskPrompt: "Write three different opening lines for a story about a school assembly where a strange message appears. Choose your strongest one and continue for 4-5 more sentences.",
    revisionGoal: "Make the opening feel immediate and make sure it clearly matches the assembly topic.",
    scaffoldNotes: ["Open with the message or the moment it appears.", "Use a surprising detail from the hall.", "Make the first line fit the assembly scene exactly."],
  },
];

const FALLBACK_LESSONS: Record<string, LessonPayload> = {
  show_not_tell: {
    title: "Show, Not Tell",
    focus: "Replace flat emotion statements with action, body language, and sensory clues.",
    teachingPoint: "Instead of naming the feeling directly, show what the character does, notices, or says.",
    strongExample: "Mia gripped the cold railing and read the results board twice before letting out a shaky breath.",
    weakExample: "Mia was nervous and then relieved.",
    taskPrompt: "Write 5-7 sentences set outside the principal's office while a student waits to hear whether they made the school robotics team. Do not use the words nervous, scared, happy, or relieved.",
    revisionGoal: "Replace one flat feeling sentence with actions, gestures, and one detail from the office scene.",
    suggestedTimeMinutes: 8,
    scaffoldNotes: ["Start with a body action near the office door or window.", "Add one sound or visual detail from the scene.", "End with a reaction that reveals the feeling."],
  },
  opening_hook: {
    title: "Opening Hook",
    focus: "Start with tension, curiosity, or an unusual image in the first line.",
    teachingPoint: "A strong hook makes the reader ask a question immediately.",
    strongExample: "The envelope was already open when Noah found it on his desk.",
    weakExample: "One day Noah went to school and something interesting happened.",
    taskPrompt: "Write three different opening lines for a story about a mystery at school. Choose your strongest one and continue for 4-5 more sentences.",
    revisionGoal: "Make the first line create curiosity straight away.",
    suggestedTimeMinutes: 8,
    scaffoldNotes: ["Begin with a problem, surprise, or strange detail.", "Avoid 'One day' or 'I am going to tell you about'.", "Make the reader want the next sentence."],
  },
  paragraph_expansion: {
    title: "Paragraph Expansion",
    focus: "Grow one simple idea into a fuller, more vivid paragraph.",
    teachingPoint: "Expand by adding action, detail, reaction, and consequence.",
    strongExample: "The dog barked once, then launched itself at the gate, claws scraping the wood while leaves spun across the path.",
    weakExample: "The dog barked loudly at the gate.",
    taskPrompt: "Take this sentence and expand it into one strong paragraph: 'The lights went out during dinner.'",
    revisionGoal: "Add at least three different kinds of detail instead of repeating the same idea.",
    suggestedTimeMinutes: 10,
    scaffoldNotes: ["What happened first?", "What did someone notice?", "What changed because of it?"],
  },
  sensory_detail: {
    title: "Sensory Detail",
    focus: "Use carefully chosen details from sight, sound, touch, smell, or taste.",
    teachingPoint: "One or two precise sensory details are stronger than a long list.",
    strongExample: "The air smelled of wet leaves, and the bench pressed cold through Sam's jumper.",
    weakExample: "It was a nice park with lots of things to see.",
    taskPrompt: "Describe a storm arriving at the oval in 5-6 sentences. Include at least two senses other than sight.",
    revisionGoal: "Replace vague describing words with exact sensory details.",
    suggestedTimeMinutes: 8,
    scaffoldNotes: ["Pick the two strongest senses.", "Use one precise noun.", "Avoid listing too many details."],
  },
};

function buildFallbackLesson(skillCode: string, mode: WritingMode): LessonPayload {
  const base = FALLBACK_LESSONS[skillCode] ?? {
    title: "Targeted Writing Practice",
    focus: "Build one writing move clearly and carefully.",
    teachingPoint: "Focus on one improvement at a time so the revision feels manageable.",
    strongExample: "The final version adds clarity, detail, and a stronger sense of purpose.",
    weakExample: "The draft says the idea, but it stays too general.",
    taskPrompt: "Write a short paragraph that practises the target skill in a clear, controlled way.",
    revisionGoal: "Improve one sentence so the target skill is easier to notice.",
    suggestedTimeMinutes: 8,
    scaffoldNotes: ["Keep it short.", "Focus on one move.", "Revise one sentence carefully."],
  };

  const resolvedBase =
    skillCode === "opening_hook"
      ? {
          ...base,
          ...OPENING_HOOK_VARIANTS[Math.floor(Math.random() * OPENING_HOOK_VARIANTS.length)],
        }
      : skillCode === "show_not_tell"
        ? {
            ...base,
            ...SHOW_NOT_TELL_VARIANTS[Math.floor(Math.random() * SHOW_NOT_TELL_VARIANTS.length)],
          }
        : base;

  if (mode === "guided_writing") {
    return {
      ...resolvedBase,
      focus: `${resolvedBase.focus} Then revise the piece with one deliberate improvement.`,
      revisionGoal: `${resolvedBase.revisionGoal} In guided mode, make one revision move obvious.`,
      suggestedTimeMinutes: Math.max(resolvedBase.suggestedTimeMinutes, 10),
    };
  }

  return resolvedBase;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileId = Number(body.profileId);
    const skillCode =
      typeof body.skillCode === "string" && body.skillCode.trim()
        ? body.skillCode.trim()
        : "show_not_tell";
    const mode: WritingMode =
      body.mode === "guided_writing" ? "guided_writing" : "micro_skill_drill";

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Valid profileId is required" }, { status: 400 });
    }

    let lesson: LessonPayload;
    try {
      const rawLesson = await chat(
        buildWritingSkillLessonPrompt(),
        buildWritingSkillLessonUserPrompt({ skillCode, mode }),
        1200
      );
      lesson = parseJSON<LessonPayload>(rawLesson);
    } catch (error) {
      console.warn("Writing lesson generation fell back to local template:", error);
      lesson = buildFallbackLesson(skillCode, mode);
    }

    const session = await prisma.writingSession.create({
      data: {
        profileId,
        sessionMode: mode,
        targetSkill: skillCode,
        promptText: lesson.taskPrompt,
        writingType: "coaching",
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      mode,
      skillCode,
      lesson,
    });
  } catch (error) {
    console.error("POST /api/writing/lesson error:", error);
    return NextResponse.json({ error: "Failed to create writing lesson" }, { status: 500 });
  }
}
