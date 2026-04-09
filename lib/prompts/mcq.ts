import { KnowledgePoint, SessionDifficulty } from "@/types/game";

const DIFFICULTY_GUIDANCE: Record<SessionDifficulty, string> = {
  Apprentice: "Suitable for a bright Year 4 student. Single-step reasoning. Simple scenarios with familiar contexts.",
  Journeyman: "Suitable for a Year 5 student aiming for selective entry. Two-step reasoning. Moderate complexity with mild twists.",
  Archmage: "Suitable for top-performing Year 5 preparing for GATE/ASET. Three or more reasoning steps. Tricky distractors that catch common errors.",
};

const DIFFICULTY_STEPS: Record<SessionDifficulty, string> = {
  Apprentice: "1 reasoning step",
  Journeyman: "exactly 2 reasoning steps",
  Archmage: "3 or more reasoning steps, with at least one non-obvious sub-step",
};

// Per-knowledge-point authoring constraints grounded in real ASET question patterns
const QR_KNOWLEDGE_POINT_NOTES = `
KNOWLEDGE POINT AUTHORING RULES (apply these to the relevant topic codes):

QR-01 Number patterns & sequences:
  - Rule must be arithmetic (+/−) or geometric (×/÷), never both combined at Apprentice
  - At Archmage, use two interleaved sequences or a second-order difference
  - Ask "what comes next?" or "what is the missing term?"

QR-02 Probability & chance:
  - Express probability as "X in Y" (e.g., "3 in 8") or as a simple fraction — NEVER as a percentage
  - Include a concrete set (bag of marbles, box of cards, jar of objects)
  - At least one option must reflect the wrong denominator (forgetting an item was removed)

QR-03 Combinatorics & counting:
  - Use the multiplication principle only — no factorials, no nCr notation
  - Give 2 or 3 independent choices (e.g., tops × pants × shoes)
  - One distractor = sum instead of product; one = miscount of one category

QR-04 Ratio & proportion:
  - Use a real-world context: recipe scaling, mixing colours, map scale
  - State the ratio explicitly in the question
  - At Archmage, add a step before or after (e.g., find total before applying ratio)

QR-05 Fractions & percentages:
  - Avoid trivial fractions (1/2, 1/4) at Journeyman+
  - One question per batch may combine fraction + percentage in the same scenario
  - Distractors: wrong numerator/denominator flip; applying % to wrong base

QR-06 Time & rate:
  - Use distance/speed/time OR work-rate problems (two taps filling a tank, two workers)
  - All values must be whole numbers at Apprentice; decimals allowed at Archmage
  - At least one distractor = correct formula but arithmetic error

QR-07 Logical deduction with numbers:
  - Use 2–4 named characters (e.g., Amir, Beatrice, Chen) with clear ordering relationships
  - State comparisons explicitly: "Amir has more than Beatrice" — no ambiguous language
  - Question asks: who has most/least, or what is the order

QR-08 Data interpretation — tables:
  - ALWAYS embed a small data table in the "context" field using plain text with | separators
  - Table must have 2–4 columns and 3–5 rows, with a clear header row
  - Question must require reading ≥2 cells (not just a single cell lookup)
  - One distractor = correct column but wrong row

QR-09 Data interpretation — charts/graphs:
  - Describe the chart as named data points in "context" (e.g., "Bar chart: Mon=12, Tue=8, Wed=15, Thu=10, Fri=9")
  - Ask comparative questions: "On which day was X highest?", "How much more on X than Y?"
  - Do NOT use image URLs — describe values in text

QR-10 Measurement & spatial reasoning:
  - Involve area, perimeter, or volume — but do NOT require formula recall; give the formula if needed
  - Include a shape description in the question (e.g., "a rectangle 6m long and 4m wide")
  - At Archmage, combine two shapes (L-shape, compound figure)

QR-11 Money & economic reasoning:
  - Use everyday transactions: best value, change, profit/loss, discount
  - Include at least one unit-price comparison
  - Distractors: adding when should subtract; using wrong unit

QR-12 Set theory & Venn diagrams:
  - Describe sets in "context" as overlapping groups (e.g., "18 students play sport, 12 play music, 7 play both")
  - Ask: how many play ONLY sport, OR how many total, OR how many neither
  - One distractor = forgetting to subtract the overlap

QR-13 Logic puzzles (knights & knaves style):
  - Always state who ALWAYS tells the truth and who ALWAYS lies at the start
  - 2–3 characters, each making one statement
  - The correct answer is the ONLY logically consistent assignment
  - Explanation must walk through the deduction step by step

QR-14 Symmetry & transformation (numeric):
  - Use a number grid or simple coordinate system
  - Ask which cell/value corresponds to the reflected or rotated position
  - Draw the grid in "context" using plain text rows

QR-15 Multi-step word problems:
  - Must visibly chain exactly 2–3 of the above knowledge points in one scenario
  - The explanation MUST list each sub-step as a numbered step
  - At Archmage, at least one step depends on the result of a previous step

QR-16 Science reasoning:
  - Introduce a FICTIONAL physical law or property in the question (so no prior science knowledge is needed)
  - Example: "On planet Zorb, all objects weigh 3 times their Earth weight."
  - Apply the given rule to a novel scenario — pure reasoning, no memorisation
`;

export function buildQRSystemPrompt(): string {
  return `You are an expert question writer for WA GATE / ASET (Australia) exam preparation.
You write Quantitative Reasoning questions for Year 5 students (age 10–11).

ASET PHILOSOPHY:
This test measures REASONING ABILITY, not curriculum mathematics. Every question must require
the student to look carefully at information, find relationships or patterns, and reason through
a problem — NOT to recall a formula or apply a standard school method.
A student who has never studied fractions formally should still be able to work out a fraction
question by thinking carefully about the numbers. Design for this.

QUESTION QUALITY RULES:
- Each question requires REASONING, not arithmetic recall
- No calculators assumed — all arithmetic must be doable mentally or on scratch paper
- Each question has EXACTLY 4 options (A, B, C, D)
- Exactly ONE option is correct
- DISTRACTOR DESIGN (critical): For each question, construct distractors as follows:
    • Distractor 1: Student uses correct reasoning method but makes an arithmetic slip
    • Distractor 2: Student uses the wrong operation on the correct numbers (e.g., adds instead of multiplies)
    • Distractor 3: Student makes the most common conceptual mistake for this topic (e.g., ignoring overlap in a Venn diagram)
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
    ...familiarTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → generate ${t.count} question(s) [FAMILIAR — student has practised this]`),
    ...challengeTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → generate ${t.count} question(s) [CHALLENGE — new or weak area, slightly easier within this difficulty]`),
  ].join("\n");

  return `Generate exactly ${totalCount} Quantitative Reasoning questions for an ASET/WA GATE Year 5 student.

DIFFICULTY: ${DIFFICULTY_GUIDANCE[difficulty]}
Each question must require ${DIFFICULTY_STEPS[difficulty]}.

TOPIC ALLOCATION:
${topicList}

${QR_KNOWLEDGE_POINT_NOTES}

SURPRISE INSTRUCTION: For 1–2 of the FAMILIAR questions, wrap the exact same reasoning in an
unexpected or magical scenario (e.g., probability using dragon eggs instead of marbles, ratios
using wizard potions instead of recipes). Same reasoning skill — delightful new context.

OUTPUT FORMAT — a JSON array of exactly ${totalCount} objects:
[
  {
    "questionText": "Full question text here",
    "context": "Table, chart description, or scenario setup if needed (empty string if not needed)",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Step-by-step explanation of why the answer is correct. For QR-15 use numbered sub-steps. Name each distractor's error.",
    "knowledgePointCode": "QR-02",
    "estimatedReadTimeMs": 8000,
    "difficulty": "${difficulty}"
  }
]

estimatedReadTimeMs guidance (time a 10-year-old needs to READ and understand, not solve):
- Simple single-sentence question: 4000–6000ms
- Question with a short scenario or 2–3 sentences: 6000–10000ms
- Question with embedded table or multi-sentence context: 10000–15000ms
- Complex multi-step scenario: 12000–18000ms`;
}

export function buildARSystemPrompt(): string {
  return `You are an expert question writer for WA GATE / ASET Abstract Reasoning.
You create visual pattern questions for Year 5 students (age 10–11).

Abstract Reasoning tests the ability to recognise patterns and rules in sequences or grids of shapes.
All questions are rendered as SVG grids — you output STRUCTURED DATA, not images.

SHAPE VOCABULARY:
- Shapes: "triangle" | "circle" | "square" | "pentagon" | "star" | "arrow" | "cross" | "empty"
- Rotation: 0 | 90 | 180 | 270 (degrees clockwise)
- Fill: "solid" | "outline" | "striped"
- Size: "small" | "large"

QUESTION TYPES:
1. "sequence" — a row of exactly 4 cells forming a sequence; student picks what comes 5th (the answer)
   - gridData: array of exactly 4 cell objects
   - IMPORTANT: gridData must always contain exactly 4 cells. The ? is implied as the 5th.
2. "pattern" — a 3×3 grid with one cell being {"shape":"empty","rotation":0,"fill":"outline","size":"small"} (the ? cell)
   - gridData: a 3×3 nested array; exactly one cell must be the empty placeholder
3. "odd_one_out" — a row of exactly 4 cells; student picks which one breaks the rule
   - CRITICAL RULE: Exactly 3 cells must follow an identical rule; exactly 1 cell breaks it.
   - NEVER make a 2-vs-2 split. Always 3 share the rule, 1 is the odd one out.
   - gridData: 1×4 array (one row of 4 cells)
   - options: the same 4 cells in the same order as gridData; correct = "A", "B", "C", or "D"
   - The explanation MUST name the shared rule of the 3 identical cells
4. "analogy" — a 2×2 grid where A:B as C:? (AR-10 only)
   - gridData: [[A, B], [C, empty_placeholder]]
   - options: 4 candidate D cells
   - explanation must state the transformation rule that maps A→B, and confirm C→D follows it

QUALITY RULES:
- Sequences must use exactly 4 cells (not 3, not 5)
- Rules must be visually identifiable — never rely on counting pixels or invisible attributes
- Good rules: rotation +90° clockwise each step, fill cycles solid→striped→outline→solid, size alternates large/small, count increases by 1 shape per cell
- Each question should have exactly one valid answer; distractors should change just enough to be plausible

OUTPUT: Valid JSON only. No markdown fences.`;
}

export function buildARBatchPrompt(params: {
  familiarTopics: { point: KnowledgePoint; count: number }[];
  challengeTopics: { point: KnowledgePoint; count: number }[];
  totalCount: number;
  difficulty: SessionDifficulty;
}): string {
  const { familiarTopics, challengeTopics, totalCount, difficulty } = params;

  const topicList = [
    ...familiarTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → ${t.count} question(s) [FAMILIAR]`),
    ...challengeTopics.map((t) => `  - ${t.point.code} "${t.point.name}" → ${t.count} question(s) [CHALLENGE]`),
  ].join("\n");

  const difficultyAttrRule = {
    Apprentice: "Use SINGLE-ATTRIBUTE changes only (rotation OR fill OR size OR count — not combined). One clear rule per question.",
    Journeyman: "Use TWO-ATTRIBUTE changes (e.g., rotation + fill changing simultaneously). The rule must be discoverable within 30 seconds.",
    Archmage: "Use THREE-ATTRIBUTE simultaneous changes (AR-09), or use analogy type (AR-10). The rule should require careful analysis.",
  }[difficulty];

  return `Generate exactly ${totalCount} Abstract Reasoning questions for ASET/WA GATE Year 5.

DIFFICULTY: ${difficulty}
${difficultyAttrRule}

TOPIC ALLOCATION:
${topicList}

TOPIC NOTES:
- AR-01 (Rotation): Use clockwise rotation. Common increments: 45°, 90°, 135°.
- AR-02 (Reflection): Mirror horizontally or vertically — not both at once (unless Archmage).
- AR-03 (Fill changes): Cycle through solid → striped → outline → solid, or solid ↔ outline.
- AR-04 (Size changes): Alternate large/small, or shrink progressively.
- AR-05 (Count changes): Number of shapes per cell increases or decreases by 1 each step.
- AR-06 (Position changes): A shape moves between fixed positions within a cell grid (e.g., top-left → top-right → bottom-right).
- AR-07 (Combination rules): "pattern" type. Cell in rightmost column = visual combination of left two columns' shapes.
- AR-08 (Odd-one-out): "odd_one_out" type. Exactly 3 share a rule, 1 breaks it. Never 2-vs-2.
- AR-09 (Multi-attribute): "sequence" or "pattern" type. Track 3 attributes simultaneously.
- AR-10 (Analogy): "analogy" type ONLY. gridData is [[A,B],[C,empty]]. Transformation A→B must also map C→D.

OUTPUT FORMAT — a JSON array of exactly ${totalCount} objects:
[
  {
    "type": "sequence",
    "questionText": "What comes next in this sequence?",
    "gridData": [
      {"shape":"circle","rotation":0,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":90,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":180,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":270,"fill":"solid","size":"large"}
    ],
    "options": [
      {"shape":"circle","rotation":0,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":90,"fill":"outline","size":"large"},
      {"shape":"square","rotation":0,"fill":"solid","size":"large"},
      {"shape":"circle","rotation":270,"fill":"solid","size":"small"}
    ],
    "correct": "A",
    "explanation": "The circle rotates 90° clockwise each step. After 270°, it returns to 0°. Option B changes the fill incorrectly. Option C changes the shape. Option D changes the size.",
    "knowledgePointCode": "AR-01",
    "estimatedReadTimeMs": 15000
  }
]

For "pattern" (3×3 grid): gridData is a 3×3 nested array ([[row0], [row1], [row2]]) where one cell is {"shape":"empty","rotation":0,"fill":"outline","size":"small"} marking the ? cell.
For "odd_one_out": gridData is [[cell, cell, cell, cell]] (1 row of 4 cells). options lists all 4 cells. correct is "A"/"B"/"C"/"D" indicating which is odd.
For "analogy": gridData is [[A, B], [C, {"shape":"empty","rotation":0,"fill":"outline","size":"small"}]].
estimatedReadTimeMs for AR: 10000–20000 (these take time to visually process; use 15000–20000 for AR-09/AR-10).`;
}

export function buildRCSystemPrompt(): string {
  return `You are an expert passage and question writer for WA GATE / ASET Reading Comprehension.
You create reading passages and questions for Year 5 students (age 10–11).

PASSAGE RULES:
- 200–400 words per passage
- Genre variety (rotate across sessions): fiction, non-fiction, persuasive, informational, poetry, drama
- Can include embedded data for RC-06 (tables, lists of facts)
- Age-appropriate vocabulary with 2–3 challenging words that can be inferred from context
- Engaging topics: nature, science, history, adventure, sport, animals, technology, biography

GENRE-SPECIFIC FORMAT RULES:
- Poetry: Preserve line breaks using \\n within the string. Include 2–4 stanzas. At least one question must quote or reference a specific line.
- Drama/script: Use "CHARACTER NAME: dialogue" format for each line. Include a brief stage direction in square brackets if useful (e.g., [The wizard enters slowly]). One question must test who said something or why a character acted.
- Non-fiction / informational: May include a short embedded table (use | separators with a header row) for RC-06.

QUESTION RULES:
- 3–5 questions per passage
- Each question targets a specific RC knowledge point
- 4 options (A–D), exactly one correct
- EVERY passage must include exactly 1 RC-03 inference question

RC-03 INFERENCE — CRITICAL RULE:
  The correct answer to an RC-03 question must NOT be stated anywhere in the passage.
  The student must logically DEDUCE the answer from clues in the text.
  If you can find the answer by quoting one sentence from the passage verbatim, it is NOT an inference question — rewrite it.
  Wrong distractors for RC-03: one option should be a true fact from the passage (but wrong answer to this specific question); one should be a plausible guess contradicted by the text.

RC-06 TABLE/CHART — FORMAT RULE:
  When a passage includes a table, the passageText must contain the table in this format:
  | Column A | Column B | Column C |
  |----------|----------|----------|
  | value    | value    | value    |
  The question for RC-06 must require the student to compare ≥2 rows or columns, not just read a single cell.

DISTRACTOR DESIGN RULES (apply to ALL question types):
- One wrong option must be a TRUE FACT from the passage — it is correct information but the wrong answer to this specific question (this catches students who find any matching text without checking the question)
- One wrong option must be PLAUSIBLE but contradicted somewhere in the text
- Avoid obviously absurd or off-topic distractors — all 4 options should look reasonable at first glance

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

  const genreInstruction = passageCount >= 3
    ? `GENRE DISTRIBUTION (required for ${passageCount} passages):
  - At least 1 passage must be non-fiction or informational
  - At least 1 passage must be fiction, poetry, or drama
  - At least 1 passage must contain an embedded table or chart (RC-06)
  - Vary genres — do not repeat the same genre twice in a batch`
    : `GENRE: Choose a varied genre (fiction, non-fiction, poetry, or drama). Include an embedded table if RC-06 is in the knowledge point mix.`;

  return `Generate ${passageCount} reading passage(s) with ${questionsPerPassage} questions each for ASET Year 5.

DIFFICULTY: ${DIFFICULTY_GUIDANCE[difficulty]}
TARGET KNOWLEDGE POINTS: ${kpList}

${genreInstruction}

Distribute questions across RC-01 through RC-06. EVERY passage must include exactly 1 RC-03 (inference) question.
Ensure RC-03 questions require genuine deduction — the answer must not appear verbatim in the passage.

OUTPUT FORMAT — a JSON array of ${passageCount} passage objects:
[
  {
    "passageTitle": "The Migration",
    "passageType": "non-fiction",
    "passageText": "Full passage text here. For poetry use \\n for line breaks. For tables use | separators.",
    "questions": [
      {
        "questionText": "What can we infer about the whale's behaviour during winter?",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correct": "B",
        "explanation": "The passage states X and Y, from which we can deduce B. Option A is a true fact from the passage but answers a different question. Option C is contradicted by the passage when it says Z.",
        "knowledgePointCode": "RC-03",
        "estimatedReadTimeMs": 25000
      }
    ]
  }
]

estimatedReadTimeMs for RC: 15000–35000 (includes passage reading time for first question; 8000–15000 for follow-up questions on the same passage).`;
}
