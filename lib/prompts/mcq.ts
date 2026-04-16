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
  Six subtypes — choose the right one for the difficulty level:
  1. Ascending (up): small gaps → try addition; large gaps → try multiplication
  2. Descending (down): small gaps → try subtraction; large gaps → try division
  3. Combination: alternating up/down — split odd-position and even-position terms into two sub-series, each with its own rule
  4. Gaps (hard): large irregular gaps → try exponentials (squares, cubes) or square roots
  5. Stand-in constants: one number repeats as a "dummy" — exclude it, then find the pattern in the remaining numbers
  6. Jumps (dual-track): two interleaved series — positions 1,3,5 follow one rule; positions 2,4,6 follow another
  Also valid: grouped bracket format [16,33][7,15][?,55] and matrix format (rows/cols with one missing cell)
  Difficulty mapping:
    Apprentice → subtypes 1 & 2 only (ascending/descending)
    Journeyman → subtypes 3 or 4 (combination or gaps)
    Archmage  → subtypes 5 or 6 (stand-in/jumps), or matrix/bracket format
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
  - "Per unit first" method: total ÷ (sum of ratio parts) = value of 1 part; then multiply each part.
    Example: ratio 3:5, total 40 → 1 part = 40÷8 = 5 → shares are 15 and 25.
  - Use a real-world context: recipe scaling, mixing colours, map scale
  - State the ratio explicitly in the question
  - At Archmage, add a pre-step (find total first) or post-step (apply the result to a further calculation)

QR-05 Fractions & percentages:
  - Avoid trivial fractions (1/2, 1/4) at Journeyman+
  - One question per batch may combine fraction + percentage in the same scenario
  - Distractors: wrong numerator/denominator flip; applying % to wrong base

QR-06 Time & rate:
  - Core principle — "Rate of 1 unit": always reduce the rate to 1 unit before scaling.
    For work-rate problems (two workers, two taps): express each agent's share of the task per unit time as a fraction, then ADD the fractions to find the combined rate.
    Example: Worker A does 1/6 of a job per hour; Worker B does 1/4 per hour → together 1/6 + 1/4 = 5/12 per hour → job takes 12/5 hours.
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
  - 5-step solving method (author the explanation using these steps):
    (1) Find the requirement — what is the question actually asking?
    (2) Notate key info in shorthand — pull out only the numbers/units that matter
    (3) Unify units — convert so all values are in the same unit before calculating
    (4) Calculate — show each arithmetic operation clearly
    (5) Verify — check the answer makes sense in the context of the story
  - Must visibly chain exactly 2–3 of the above knowledge points in one scenario
  - The explanation MUST list each sub-step as a numbered step (use the 5-step framework)
  - At Archmage, at least one step depends on the result of a previous step

QR-16 Science reasoning:
  - Introduce a FICTIONAL physical law or property in the question (so no prior science knowledge is needed)
  - Example: "On planet Zorb, all objects weigh 3 times their Earth weight."
  - Apply the given rule to a novel scenario — pure reasoning, no memorisation
`;

// Per-knowledge-point authoring constraints grounded in real ASET AR question patterns
const AR_KNOWLEDGE_POINT_NOTES = `
ABSTRACT REASONING — KNOWLEDGE POINT AUTHORING NOTES:

AR-01 (Rotation):
  - Rotation is always around a fixed point (inside the shape, at a corner, or on the page)
  - Common increments: 45°, 90°, 135°, 180°
  - "Direction" (N/NE/E/SE/S/SW/W/NW on a compass) is a variant of rotation — treat it the same way
  - At Apprentice: 90° or 180° steps only. At Archmage: 45° or 135° steps, or compound rotations.

AR-02 (Reflection/Flips):
  - Horizontal flip (on vertical axis): left ↔ right. Size and proportions are preserved.
  - Vertical flip (on horizontal axis): top ↔ bottom. Size and proportions are preserved.
  - At Archmage, "stacks" variant: flip a multi-layer image so the bottom layer becomes the new top (most visible) layer.
  - Never reflect AND rotate in the same Apprentice/Journeyman question.

AR-04 (Size changes):
  - At Archmage, use the "ordering" variant: 5 answer options arranged by degree of change (e.g. 5 different sizes); student must identify which fits a specific position in the sequence.

AR-06 (Position changes):
  - Think of the cell as a compass with 8 positions: N, NE, E, SE, S, SW, W, NW.
  - Elements move clockwise or anticlockwise each step, commonly 45° or 90° per step.
  - Track the element's compass position explicitly in the explanation (e.g. "moves from NW → N → NE").

AR-07 (Combination rules):
  - Also covers two special variants:
    • Superimposition: image A overlaid on image B produces the result; or result minus A = B
    • Inverse: one image is the foreground/background swap of another (solid↔outline, filled↔empty); this is a 1-to-1 relationship, not a sequential rule
  - The explanation must name which variant is used.

AR-08 (Odd-one-out):
  - Use "commonality + isolation" strategy:
    (1) Find the rule shared by exactly 3 of the 4 images (commonality)
    (2) Identify the one that breaks that rule (isolation)
  - NEVER construct a 2-vs-2 split — always 3 share the rule, 1 breaks it.
  - The explanation MUST name the shared rule first, then name why the odd one breaks it.

AR-09 (Multi-attribute):
  - Track each attribute (rotation, fill, size, count) separately first; write each rule before combining.
  - At Archmage:
    • Letters in patterns variant: a letter represents a shape; a modifier letter represents a transform
    • Numbers in patterns variant: dots/lines as visual quantities → treat as a numerical sequence
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
- Rotation: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315 (degrees clockwise)
- Fill: "solid" | "outline" | "striped"
- Size: "small" | "large"
- Position (optional, AR-06 only): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "C"
  Omit "position" entirely for all other KP types — it defaults to centre. Only include it when
  position is the changing attribute being tested.

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

QUESTION TYPE DISTRIBUTION (strictly enforce across this batch):
- "pattern" (3×3 matrix) must be ≥ 50% of questions — this is the dominant GATE/ASET format.
- "sequence" ≤ 30% of questions.
- "odd_one_out" + "analogy" combined ≤ 20% of questions.
- Exception: if ALL KPs in this batch are AR-08, use "odd_one_out" exclusively.
             If ALL KPs are AR-10, use "analogy" exclusively.

3×3 PATTERN RULES (for all "pattern" type questions):
- The rule must be discoverable by reading EACH ROW independently, then confirmed by column.
- Do NOT use diagonal-only rules — they are visually ambiguous in a grid.
- Preferred patterns: fill cycles left-to-right, rotation increments left-to-right, shape changes top-to-bottom.

TOPIC ALLOCATION:
${topicList}

TOPIC NOTES:
- AR-01 (Rotation): Use clockwise rotation. Common increments: 45°, 90°, 135°.
- AR-02 (Reflection): Mirror horizontally or vertically — not both at once (unless Archmage).
- AR-03 (Fill changes): Cycle through solid → striped → outline → solid, or solid ↔ outline.
- AR-04 (Size changes): Alternate large/small, or shrink progressively.
- AR-05 (Count changes): Number of shapes per cell increases or decreases by 1 each step.
- AR-06 (Position changes): A shape moves between compass positions within a cell. Use the "position" field ("N","NE","E","SE","S","SW","W","NW","C"). Shape moves clockwise or anticlockwise by 1–2 compass steps per transition. ALWAYS include "position" in ALL gridData cells and ALL option cells for AR-06 questions. Do NOT use "position" in other question types.
- AR-07 (Combination rules): "pattern" type. Cell in rightmost column = visual combination of left two columns' shapes.
- AR-08 (Odd-one-out): "odd_one_out" type. Exactly 3 share a rule, 1 breaks it. Never 2-vs-2.
- AR-09 (Multi-attribute): "sequence" or "pattern" type. Track 3 attributes simultaneously.
- AR-10 (Analogy): "analogy" type ONLY. gridData is [[A,B],[C,empty]]. Transformation A→B must also map C→D.

${AR_KNOWLEDGE_POINT_NOTES}

OUTPUT FORMAT — a JSON array of exactly ${totalCount} objects:
[
  {
    "type": "pattern",
    "questionText": "Which shape completes the grid?",
    "gridData": [
      [{"shape":"circle","rotation":0,"fill":"solid","size":"large"},{"shape":"circle","rotation":90,"fill":"solid","size":"large"},{"shape":"circle","rotation":180,"fill":"solid","size":"large"}],
      [{"shape":"square","rotation":0,"fill":"striped","size":"large"},{"shape":"square","rotation":90,"fill":"striped","size":"large"},{"shape":"square","rotation":180,"fill":"striped","size":"large"}],
      [{"shape":"triangle","rotation":0,"fill":"outline","size":"large"},{"shape":"triangle","rotation":90,"fill":"outline","size":"large"},{"shape":"empty","rotation":0,"fill":"outline","size":"small"}]
    ],
    "options": [
      {"shape":"triangle","rotation":180,"fill":"outline","size":"large"},
      {"shape":"triangle","rotation":180,"fill":"solid","size":"large"},
      {"shape":"triangle","rotation":90,"fill":"outline","size":"large"},
      {"shape":"circle","rotation":180,"fill":"outline","size":"large"}
    ],
    "correct": "A",
    "explanation": "Each row uses one shape type. Within each row, rotation increases by 90° left-to-right (0°→90°→180°). Row 3 uses triangles with outline fill, so the missing cell is a triangle at 180° with outline fill. Option B has wrong fill. Option C has wrong rotation. Option D has wrong shape.",
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
- Genre variety — rotate across ALL 8 text types across sessions:
    1. Narrative fiction
    2. Non-fiction / informational
    3. Persuasive / opinion piece
    4. Poetry
    5. Interview / dialogue / script
    6. Historical text
    7. Autobiographical
    8. Cartoon / visual described in words
- Can include embedded data for RC-06 (tables, lists of facts)
- Age-appropriate vocabulary with 2–3 challenging words that can be inferred from context
- Engaging topics: nature, science, history, adventure, sport, animals, technology, biography

5-STEP ACTIVE READING APPROACH (inform how questions are sequenced and calibrated):
  (1) Questions are read first — ensure each question can be targeted before reading the whole passage
  (2) Passage is read actively — key ideas should be identifiable (not buried in decorative prose)
  (3) Relevant section re-read for each question — question targets should point to a specific paragraph
  (4) Clearly wrong options eliminated first — ensure 1–2 options are dismissible without re-reading
  (5) Best answer selected — for RC-03 inference, the best answer must be the ONLY logically defensible deduction

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

RC-03 INFERENCE — COMMON TYPES:
  Character motivation, implied consequence, author's attitude.
  Test (self-check): if you can quote one sentence from the passage that IS the answer → it is NOT an inference question; rewrite it.

RC-04 VOCABULARY IN CONTEXT:
  Design the question so the student can solve it by covering the word, reading the sentence, deciding what word fits, then matching to options.
  All four options must be real words that could plausibly belong to the sentence out of context — only in context does one option clearly win.

RC-05 TEXT STRUCTURE:
  The answer options ARE the structural descriptions (e.g., "It compares two things", "It tells a story in time order", "It argues a point").
  Do not ask about structure by quoting a line — ask at the whole-passage level.

RC-06 TABLE/CHART — FORMAT RULE:
  When a passage includes a table, the passageText must contain the table in this format:
  | Column A | Column B | Column C |
  |----------|----------|----------|
  | value    | value    | value    |
  The question for RC-06 must require the student to compare ≥2 rows or columns, not just read a single cell.

RC-07 FIGURATIVE LANGUAGE & TONE:
  Figurative language subtypes: simile (uses "as" or "like"), metaphor (says X "is" Y), hyperbole (deliberate
  exaggeration for effect), personification (object or animal acts human), alliteration, onomatopoeia.
  Tone analysis — use the "on-balance keyword approach": identify 3–4 mood-carrying words in the passage,
  then determine the overall tone from their balance (e.g. mostly dark/tense words → ominous/foreboding tone).
  Question formats: "What figure of speech is used in line X?", "What is the overall tone of this passage?",
  "The phrase '...' is an example of which technique?"
  Distractor design: offer two figurative language types that share surface features (e.g. metaphor vs.
  personification — both say something "is" something else; student must check whether it's human behaviour).
  Best paired with: narrative fiction, poetry, or historical passages.

RC-08 SEQUENCE & CHRONOLOGY:
  Question types: "What happened BEFORE X?", "Which event came FIRST in the story?",
  "What CAUSED X to happen?", "What was the RESULT of Y?"
  Use signal words in the passage: before, after, then, next, because, as a result, finally, previously, since.
  Distractor design: list correct events in the wrong order; confuse cause with effect (swap cause and result).
  Works across narrative text (plot order) and non-fiction (cause-effect chains in informational text).
  At Archmage: ask about a non-linear narrative or a passage where events are told out of order.

RC-09 CARTOON & VISUAL LITERACY:
  Only applicable when passageType is "cartoon" — describe the cartoon scene in prose in passageText
  (since no actual image is embedded). Include: what is drawn, labels, sizes, positioning, expressions.
  Core techniques to test: symbolism (an object represents a bigger idea), exaggeration (size/proportion
  conveys importance), labels (explicit text clarifies meaning), irony (gap between image and caption/reality).
  Question formats: "What does the [object] in the cartoon represent?",
  "What is the cartoonist's message about X?", "What technique does the cartoonist use to show Y?"
  Distractor design: always include one "literal reading" option (what the image literally shows) vs. the
  correct symbolic/ironic reading. Students who don't understand visual literacy will choose the literal option.

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

Distribute questions across the target knowledge points listed above. EVERY passage must include exactly 1 RC-03 (inference) question.
Ensure RC-03 questions require genuine deduction — the answer must not appear verbatim in the passage.
If the batch knowledge point mix includes RC-07, the passage must be narrative fiction or poetry.
If the batch knowledge point mix includes RC-09, the passage must be of type "cartoon" (describe visually in prose).
RC-08 (sequence/chronology) may appear in any text type that has a clear event order.

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
