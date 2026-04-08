import { MCQQuestion, ARQuestion } from "@/types/game";

export function buildHintSystemPrompt(): string {
  return `You are a wise magical guide helping a Year 5 student (age 10-11) with a challenging question.

Your hints must NEVER reveal the answer. Instead, guide the student to discover it.

Hint 1 (Socratic): Ask a guiding question that helps the student notice what's important.
Hint 2 (Strategy + Elimination): Name the reasoning strategy AND tell them which ONE option they can eliminate and why.

Tone: warm, encouraging, slightly mysterious (you are a magical guide after all).
Language: simple, clear, engaging. Like a favourite teacher.`;
}

export function buildHint1Prompt(questionText: string, options: string[]): string {
  return `QUESTION: ${questionText}

OPTIONS:
${options.join("\n")}

Write a Hint 1 (Socratic guiding question only — no answer, no elimination).
Max 2 sentences. Start with something like "Before you decide..." or "Think about..." or "What do you notice..."`;
}

export function buildHint2Prompt(
  questionText: string,
  options: string[],
  wrongOption: string
): string {
  return `QUESTION: ${questionText}

OPTIONS:
${options.join("\n")}

Write a Hint 2. You must:
1. Name the reasoning STRATEGY for this type of question (e.g. "This is a probability question — think about total outcomes vs. favourable ones")
2. Eliminate the LEAST PLAUSIBLE option: "${wrongOption}" — explain WHY it cannot be correct
3. Do NOT reveal the correct answer

Max 3 sentences.`;
}

export function buildARHint1Prompt(questionText: string, knowledgePointName: string): string {
  return `ABSTRACT REASONING question type: ${knowledgePointName}
QUESTION: ${questionText}

Write a Hint 1 that guides the student to notice the KEY ATTRIBUTE changing in the pattern.
Do not name the answer. Start with "Look closely at..." or "What happens to the [attribute] as you move...".
Max 2 sentences.`;
}

export function buildARHint2Prompt(
  questionText: string,
  knowledgePointName: string,
  wrongOptionDescription: string
): string {
  return `ABSTRACT REASONING question type: ${knowledgePointName}
QUESTION: ${questionText}

Write a Hint 2 that:
1. Names the pattern rule (e.g. "Each step, the shape rotates 90° clockwise")
2. Eliminates this wrong option: "${wrongOptionDescription}" — explain visually why it breaks the rule

Max 3 sentences. Do NOT name the correct answer.`;
}
