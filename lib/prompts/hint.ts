/**
 * Hint system — two levels per question.
 *
 * Hint 1: Prescribes the canonical problem-solving TOOL for this knowledge point.
 *         Something the student can DO right now (draw a diagram, write a formula,
 *         build a table). Concrete and transferable — not a vague "think about it".
 *
 * Hint 2: Names the reasoning strategy AND eliminates the least plausible option.
 */

// ─── Canonical tool per knowledge-point code ───────────────────────────────
// Each entry: one sentence telling the student exactly what to draw/write/do
// before trying to answer. Grounded in real exam-prep technique.

const HINT1_TOOL: Record<string, string> = {
  // Quantitative Reasoning
  "QR-01": "Write out the sequence and jot the gap between each pair of numbers underneath. Then run through this checklist: (1) Are the numbers going up? Try addition for small gaps, multiplication for large ones. (2) Going down? Try subtraction or division. (3) Alternating up/down? Split the odd-position and even-position numbers into two separate mini-sequences and find each rule. (4) Does one number keep repeating? Ignore it — it's a dummy. Find the pattern in the rest. (5) Two interleaved tracks? List positions 1,3,5 together and positions 2,4,6 together.",
  "QR-02": "Write a fraction: favourables ÷ total. Count the total AFTER any items have been removed or added, then count how many match what you want.",
  "QR-03": "Write the number of choices for each decision and multiply them: [choice 1] × [choice 2] × [choice 3]. A quick tree diagram can help if you're unsure.",
  "QR-04": "Write the ratio as a fraction, then ask: what do I multiply (or divide) the top and bottom by to get the new amount?",
  "QR-05": "Convert everything to the same form first — either all fractions or all decimals — before you compare or calculate.",
  "QR-06": "Use the 'rate of 1 unit' strategy: reduce each rate to what ONE worker (or tap, or vehicle) can do in ONE unit of time. If two agents are involved, write each as a fraction of the whole task per unit time, then add the fractions. The combined total tells you how fast they work together.",
  "QR-07": "Make a quick table: write each person's name in a row and fill in what you know with ✓ or ✗. Use the given clues to eliminate options one by one.",
  "QR-08": "Put your finger on the exact row you need in the table, then slide across to the correct column — don't mix rows or skip a column.",
  "QR-09": "Read the axis labels before looking at any numbers. For comparison questions, find both values on the chart first, then do the arithmetic.",
  "QR-10": "Sketch the shape and label the measurements you know. If it's an unusual shape, break it into simple rectangles or triangles.",
  "QR-11": "Find the cost per unit for each option (divide total price by quantity), then compare. Or scale everything to the same quantity before comparing.",
  "QR-12": "Draw two overlapping circles — one for each group. Write the overlap number in the MIDDLE first, then fill in the sections on each side. The total = left + middle + right.",
  "QR-13": "Make a small truth table with each person's name. Assume Person A is telling the truth — does that lead to a contradiction? If yes, they must be lying. Work through each possibility.",
  "QR-14": "Draw the grid and mark the line of symmetry (or centre of rotation) clearly. Then fold or rotate the image in your mind to find where each cell maps to.",
  "QR-15": "Underline each separate piece of information in the question. Number your steps — what must you find FIRST before you can answer the main question?",
  "QR-16": "Re-read the rule the question gives you and write it as a simple formula using only the numbers provided. You need zero prior science knowledge — all the rules are in the question.",

  // Abstract Reasoning
  "AR-01": "Pick ONE shape and watch ONLY its rotation as you move through the sequence from left to right — ignore all other attributes for now.",
  "AR-02": "Find the mirror line (horizontal or vertical). Fold the image mentally along that line — which parts swap sides, and which stay put?",
  "AR-03": "Write the fill of each cell in order: solid, striped, outline... Do you see a repeating cycle?",
  "AR-04": "Write the size of the shape in each cell: large, small, large... Is it alternating, or shrinking/growing in one direction?",
  "AR-05": "Count the number of shapes inside each cell and write it down: 1, 2, 3... By how much does it change each step?",
  "AR-06": "Think of each cell as a compass with 8 positions: N, NE, E, SE, S, SW, W, NW. Write the compass position of the shape in each step of the sequence. Is it moving clockwise or anticlockwise? By how many positions each step?",
  "AR-07": "Check which variant this is: (1) Combination — cover column 3 and see if overlapping columns 1 and 2 produces it; (2) Superimposition — does image A overlaid on image B give the result? Or result minus A = B? (3) Inverse — is one image the foreground/background swap of another (solid↔outline)? Identify the variant first, then apply it.",
  "AR-08": "Use 'commonality first, then isolation': Step 1 — find the one rule that exactly THREE of the four images share (e.g., all have the same fill, or all rotate by the same amount). Step 2 — identify which image breaks that rule. Important: never split them 2-vs-2. There is always one clear group of 3 and one odd one out.",
  "AR-09": "Track ONE attribute at a time: first just the rotation, then just the fill, then just the size or count. Write each rule down separately before putting them together.",
  "AR-10": "Look at A → B. What exactly changed? Now check: does that SAME change turn C into the right answer?",

  // Reading Comprehension
  "RC-01": "Ask yourself: what would I write if I had to explain this whole passage in ONE sentence? That one sentence IS the main idea.",
  "RC-02": "The answer is stated directly in the passage — skim back through and put your finger on the exact sentence that says it.",
  "RC-03": "The answer is NOT written anywhere in the passage — you have to work it out from clues. Ask: what do the details in the text suggest, even though it's never said outright?",
  "RC-04": "Cover the word and read the sentence without it. What word would make sense here? Then choose the option with the closest meaning.",
  "RC-05": "Skim the passage quickly. Does it compare two things? Tell a story in time order? Argue a point? Identify that structure — it IS the answer.",
  "RC-06": "Read the column headers and row labels before looking at any numbers. Then find the exact cell(s) the question is asking about.",
};

// Fallback if code not found
const FALLBACK_TOOL =
  "Read the question once more, very slowly. Underline the key numbers or words, then decide: what is it actually asking you to find?";

// ─── System prompt ───────────────────────────────────────────────────────────

export function buildHintSystemPrompt(): string {
  return `You are a wise magical guide helping a Year 5 student (age 10–11) with a challenging question.

Your hints must NEVER reveal the answer. Instead, you guide the student to discover it themselves.

Hint 1: You prescribe the single best problem-solving TOOL for this question type — something concrete the student can draw, write, or do. Then you encourage them to apply it.
Hint 2: You name the reasoning strategy AND tell them which ONE option they can eliminate and exactly why.

Tone: warm, encouraging, slightly mysterious (you are a magical guide after all).
Language: simple, clear, engaging — like a favourite teacher who never gives away the answer.`;
}

// ─── QR / RC hint prompts ────────────────────────────────────────────────────

export function buildHint1Prompt(
  questionText: string,
  options: string[],
  knowledgePointCode?: string
): string {
  const tool =
    (knowledgePointCode && HINT1_TOOL[knowledgePointCode]) || FALLBACK_TOOL;

  return `QUESTION: ${questionText}

OPTIONS:
${options.join("\n")}

KNOWLEDGE POINT: ${knowledgePointCode || "general"}

Your task: Write a Hint 1 that does TWO things in order:
1. Prescribe the canonical solving tool: "${tool}"
   — Phrase this as a direct, actionable instruction (e.g. "Draw two overlapping circles…", "Write the fraction…", "Make a table…")
2. End with one short Socratic question that connects the tool to THIS specific question.

Rules:
- Do NOT give the answer or eliminate any option
- Do NOT be vague ("think about it carefully") — be specific and concrete
- Max 3 sentences total
- Warm, encouraging tone`;
}

export function buildHint2Prompt(
  questionText: string,
  options: string[],
  wrongOption: string,
  knowledgePointCode?: string
): string {
  const tool =
    (knowledgePointCode && HINT1_TOOL[knowledgePointCode]) || FALLBACK_TOOL;

  return `QUESTION: ${questionText}

OPTIONS:
${options.join("\n")}

KNOWLEDGE POINT: ${knowledgePointCode || "general"}

Write a Hint 2. You must do all three things:
1. Name the reasoning STRATEGY for this knowledge point — refer to the tool: "${tool}"
   (e.g. "This is a Venn diagram question — the overlap group is the key…")
2. Eliminate the LEAST PLAUSIBLE option: "${wrongOption}"
   — Explain precisely WHY it cannot be correct (what reasoning error leads there)
3. Do NOT reveal the correct answer

Max 3 sentences.`;
}

// ─── Abstract Reasoning hint prompts ─────────────────────────────────────────

export function buildARHint1Prompt(
  questionText: string,
  knowledgePointCode?: string
): string {
  const kpName = knowledgePointCode || "Abstract Reasoning";
  const tool =
    (knowledgePointCode && HINT1_TOOL[knowledgePointCode]) || FALLBACK_TOOL;

  return `ABSTRACT REASONING — knowledge point: ${kpName}
QUESTION: ${questionText}

Your task: Write a Hint 1 that does TWO things:
1. Give the student a concrete visual instruction: "${tool}"
   Phrase it as a direct action (e.g. "Pick one shape and watch ONLY its rotation…")
2. End with one short question that directs their attention to the KEY changing attribute in THIS pattern.

Rules:
- Do NOT name or hint at the answer
- Do NOT be vague — tell them exactly what to look at and how to track it
- Max 2 sentences
- Warm tone`;
}

export function buildARHint2Prompt(
  questionText: string,
  knowledgePointCode?: string,
  wrongOptionDescription?: string
): string {
  const kpName = knowledgePointCode || "Abstract Reasoning";
  const tool =
    (knowledgePointCode && HINT1_TOOL[knowledgePointCode]) || FALLBACK_TOOL;

  return `ABSTRACT REASONING — knowledge point: ${kpName}
QUESTION: ${questionText}

Write a Hint 2 that:
1. Describes the pattern rule precisely (e.g. "Each step, the shape rotates 90° clockwise AND the fill changes from solid to outline")
   — Reference the approach: "${tool}"
2. Eliminates this wrong option: "${wrongOptionDescription || "the last option"}"
   — Explain visually why it breaks the identified rule

Max 3 sentences. Do NOT name the correct answer.`;
}
