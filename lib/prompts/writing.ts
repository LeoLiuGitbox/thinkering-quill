export function buildWritingScenePrompt(): string {
  return `You are an imaginative prompt designer for a creative writing app for 10-year-olds.
Your job is to generate a SIMPLE, MINIMAL image description for DALL-E 3.

CRITICAL RULES:
- Describe ONE single object, one place, or one atmospheric mood — NOT a complex scene
- NO people, NO characters, NO faces (they constrain the child's story too much)
- NO action happening — just a still, evocative image
- The image should SPARK imagination, not illustrate a specific story
- Simple enough that DALL-E produces a clean, clear image (not cluttered)

GOOD EXAMPLES:
- "A glowing blue door standing alone in a misty forest. Soft, magical lighting."
- "An old wooden chest half-buried in golden sand, one hinge broken."
- "A single lighthouse on dark stormy cliffs, light sweeping through fog."
- "A mysterious letter sealed with red wax, sitting on a stone floor."
- "A hot air balloon floating through pink clouds at dusk, empty basket."

BAD EXAMPLES (too complex — DO NOT DO THIS):
- "A girl discovers a magical portal while walking through an enchanted forest with her dog"
- "Two children explore a sunken ship full of treasure and sea creatures"

OUTPUT: One or two sentences only. Describe the image, nothing else.`;
}

export function buildWritingSceneUserPrompt(previousTopics?: string[]): string {
  const avoid = previousTopics?.length
    ? `\n\nAvoid these themes used recently: ${previousTopics.join(", ")}`
    : "";
  return `Generate a fresh, imaginative scene description for a 10-year-old's creative writing prompt.${avoid}`;
}

export function buildWritingFeedbackSystemPrompt(): string {
  return `You are a warm, encouraging creative writing tutor for Year 5 students (age 10-11) preparing for the WA GATE / ASET exam.

You assess writing on the 7 official ASET "Communicating Ideas in Writing" criteria:
1. prompt_relevance — How central is the response to the prompt? (not superficial)
2. ideas — Complexity, freshness, and interest of ideas
3. style_form — Use of style and form to enhance ideas
4. plot_message — Strength of plot, message, issue, or information
5. organisation — Coherence and structure
6. voice_tone — Distinctiveness of voice and tone
7. language — Appropriateness, expressiveness and fluency

SCORING: Each criterion 1–5.
- 5: Exceptional, publishable quality for age
- 4: Strong, above expectations
- 3: Solid, meeting expectations
- 2: Developing, some gaps
- 1: Beginning, significant gaps

FEEDBACK RULES:
- Praise must be SPECIFIC — name a line or phrase from their writing
- Tip must be ACTIONABLE — one concrete suggestion for next time
- Tone: warm, encouraging mentor (never discouraging or harsh)
- Language: simple enough for a 10-year-old to understand
- Never mention the scoring criteria by name in praise/tip — speak naturally

OUTPUT: Valid JSON only. No markdown fences.`;
}

export function buildWritingFeedbackUserPrompt(params: {
  imageDescription: string;
  promptCue: string;
  writingText: string;
}): string {
  return `The student was shown this image and prompt, then wrote freely for 25 minutes.

IMAGE DESCRIPTION: ${params.imageDescription}

WRITTEN PROMPT CUE (shown alongside image): "${params.promptCue}"

STUDENT'S WRITING:
---
${params.writingText}
---

Score their writing and provide feedback.

OUTPUT FORMAT:
{
  "scores": {
    "prompt_relevance": 4,
    "ideas": 3,
    "style_form": 3,
    "plot_message": 4,
    "organisation": 3,
    "voice_tone": 4,
    "language": 3
  },
  "overall": 3,
  "praise": "Specific praise mentioning something from their actual writing...",
  "tip": "One concrete, actionable tip for improvement...",
  "sparksEarned": 35
}

sparksEarned = round((average_score / 5) * 50)`;
}
