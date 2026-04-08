import { KnowledgePoint, SessionDifficulty } from "@/types/game";

const DIFFICULTY_GUIDANCE: Record<SessionDifficulty, string> = {
  Apprentice: "Suitable for a bright Year 4 student. Straightforward scenarios, single-step reasoning.",
  Journeyman: "Suitable for a Year 5 student aiming for selective entry. Moderate complexity, 2-step reasoning.",
  Archmage: "Suitable for high-achieving Year 5 preparing for GATE/ASET. Complex, multi-step, tricky distractors.",
};

export function buildQRSystemPrompt(): string {
  return `You are an expert question writer for WA GATE / ASET (Australia) exam preparation.
You write Quantitative Reasoning questions for Year 5 students (age 10-11).

CRITICAL RULES:
- All questions must require REASONING, not curriculum maths recall
- No calculators assumed — all arithmetic must be doable mentally or with simple scratch work
- Each question must have EXACTLY 4 options (A, B, C, D)
- Exactly ONE option must be correct
- Wrong options must be plausible (common reasoning errors, not random numbers)
- Language: age-appropriate, clear, not condescending
- Scenarios should be interesting — real-world, surprising, or slightly whimsical

OUTPUT: Valid JSON only. No markdown fences. No preamble.`;
}

export function buildQRBatchPrompt(params: {
  familiarTopics: { point: KnowledgePoint; count: number }[];
  challengeTopics: { point: KnowledgePoint; count: number }[];
  difficulty: SessionDifficulty;
  totalCount: number;
}): string {
  const { familiarTopics, challengeTopics, difficulty, totalCount } = params;

  const topicList = [
    ...familiarTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → generate ${t.count} question(s) [FAMILIAR — student knows this]`),
    ...challengeTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → generate ${t.count} question(s) [CHALLENGE — new or weak area]`),
  ].join("\n");

  return `Generate exactly ${totalCount} Quantitative Reasoning questions for an ASET/WA GATE Year 5 student.

DIFFICULTY: ${DIFFICULTY_GUIDANCE[difficulty]}

TOPIC ALLOCATION:
${topicList}

SURPRISE INSTRUCTION: For 1–2 of the FAMILIAR questions, wrap the exact same reasoning in an unexpected, funny, or magical scenario (e.g., probability using dragon eggs instead of marbles, ratios using wizard potions instead of recipes). Same skill — delightful context.

OUTPUT FORMAT — a JSON array of exactly ${totalCount} objects:
[
  {
    "questionText": "Full question text",
    "context": "Optional table/passage/scenario if needed (can be empty string)",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Clear explanation of why the answer is correct and why common mistakes are wrong",
    "knowledgePointCode": "QR-02",
    "estimatedReadTimeMs": 8000,
    "difficulty": "${difficulty}"
  }
]

estimatedReadTimeMs should be the realistic time a 10yo needs to READ and UNDERSTAND the question (not solve it). Minimum 4000ms, maximum 15000ms.`;
}

export function buildARSystemPrompt(): string {
  return `You are an expert question writer for WA GATE / ASET Abstract Reasoning.
You create visual pattern questions for Year 5 students (age 10-11).

Abstract Reasoning tests the ability to recognise patterns in sequences of shapes.
All questions are rendered as SVG grids — you output STRUCTURED DATA, not images.

SHAPE VOCABULARY:
- Shapes: "triangle" | "circle" | "square" | "pentagon" | "star" | "arrow" | "cross" | "empty"
- Rotation: 0 | 90 | 180 | 270 (degrees clockwise)
- Fill: "solid" | "outline" | "striped"
- Size: "small" | "large"

QUESTION TYPES:
1. "sequence" — a row of 4+ cells, the last one is "?", student picks what comes next
2. "pattern" — a 3×3 grid with one "?" cell, student finds what fits the rule
3. "odd_one_out" — 4 cells, 3 follow a rule, student picks the odd one out

Rules must be SINGLE-ATTRIBUTE or MULTI-ATTRIBUTE changes that are visually identifiable.
Good rules: rotation clockwise 90° each step, fill cycles solid→striped→outline, count increases by 1

OUTPUT: Valid JSON only. No markdown fences.`;
}

export function buildARBatchPrompt(params: {
  familiarTopics: { point: KnowledgePoint; count: number }[];
  challengeTopics: { point: KnowledgePoint; count: number }[];
  totalCount: number;
}): string {
  const { familiarTopics, challengeTopics, totalCount } = params;

  const topicList = [
    ...familiarTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → ${t.count} question(s) [FAMILIAR]`),
    ...challengeTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → ${t.count} question(s) [CHALLENGE]`),
  ].join("\n");

  return `Generate exactly ${totalCount} Abstract Reasoning questions for ASET/WA GATE Year 5.

TOPIC ALLOCATION:
${topicList}

Note: AR-08 (Odd-one-out) uses type "odd_one_out". AR-07 (Combination rules) uses type "pattern".
All others can be "sequence" or "pattern".

OUTPUT FORMAT — a JSON array of exactly ${totalCount} objects:
[
  {
    "type": "sequence",
    "questionText": "What comes next in this sequence?",
    "gridData": [
      [{"shape":"circle","rotation":0,"fill":"solid","size":"large"}],
      [{"shape":"circle","rotation":90,"fill":"solid","size":"large"}],
      [{"shape":"circle","rotation":180,"fill":"solid","size":"large"}],
      [{"shape":"circle","rotation":270,"fill":"solid","size":"large"}]
    ],
    "options": [
      {"shape":"circle","rotation":0,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":90,"fill":"outline","size":"large"},
      {"shape":"square","rotation":0,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":270,"fill":"solid","size":"small"}
    ],
    "correct": "A",
    "explanation": "The circle rotates 90° clockwise each step. After 270°, it returns to 0°.",
    "knowledgePointCode": "AR-01",
    "estimatedReadTimeMs": 15000
  }
]

For "pattern" (3×3 grid): gridData is a 3×3 array where one cell is {"shape":"empty","rotation":0,"fill":"outline","size":"small"} (the ? cell).
For "odd_one_out": gridData is a 1×4 array of cells, and options is the same 4 cells (student picks which is odd).
estimatedReadTimeMs for AR: 10000–20000 (these take time to visually process).`;
}

export function buildRCSystemPrompt(): string {
  return `You are an expert passage writer for WA GATE / ASET Reading Comprehension.
You create reading passages and questions for Year 5 students (age 10-11).

PASSAGE RULES:
- 200–400 words per passage
- Genre variety: fiction, non-fiction, poetry, persuasive, informational
- Can include embedded data (simple tables or listed facts) for RC-06
- Age-appropriate vocabulary with 2–3 challenging words in context
- Engaging topics: nature, science, history, adventure, sport, animals, technology

QUESTION RULES:
- 3–5 questions per passage
- Each question targets a specific RC knowledge point
- 4 options (A–D), exactly one correct
- Distractors must be plausible (from the text but wrong inference, or close vocabulary)

OUTPUT: Valid JSON only. No markdown fences.`;
}

export function buildRCBatchPrompt(params: {
  passageCount: number;
  questionsPerPassage: number;
  difficulty: SessionDifficulty;
  knowledgePointMix: KnowledgePoint[];
}): string {
  const { passageCount, questionsPerPassage, difficulty, knowledgePointMix } = params;
  const kpList = knowledgePointMix.map((kp) => `${kp.code}: ${kp.name}`).join(", ");

  return `Generate ${passageCount} reading passage(s) with ${questionsPerPassage} questions each for ASET Year 5.

DIFFICULTY: ${DIFFICULTY_GUIDANCE[difficulty]}
TARGET KNOWLEDGE POINTS: ${kpList}

Distribute questions across RC-01 through RC-06. Include at least one RC-03 (inference) per passage.

OUTPUT FORMAT — a JSON array of ${passageCount} passage objects:
[
  {
    "passageTitle": "The Migration",
    "passageType": "non-fiction",
    "passageText": "Full passage text here...",
    "questions": [
      {
        "questionText": "What is the main purpose of this passage?",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correct": "B",
        "explanation": "The passage is primarily about... because...",
        "knowledgePointCode": "RC-01",
        "estimatedReadTimeMs": 20000
      }
    ]
  }
]`;
}
