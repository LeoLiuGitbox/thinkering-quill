import { AuraAlignment } from "@/types/game";

export function buildShadowNarrativePrompt(aura: AuraAlignment): string {
  const context: Record<AuraAlignment, string> = {
    unstable:
      "The student's shadow score just crossed 30. They've been answering slightly too fast on a few questions.",
    shadow_creeping:
      "The student's shadow score crossed 60. Multiple signals of rapid answering and hint dependency.",
    shadow_drift:
      "The student is in full Shadow Drift (score 80+). XP is now halved. They need encouragement to slow down.",
    bright: "The student's aura is bright — this message should not appear.",
  };

  return `You are the narrative voice of the Archive Hall — a wise, warm magical world.
Write a SHORT in-world message (2–3 sentences) to show after this student's session.

Context: ${context[aura]}

RULES:
- Use magical narrative language (never "you cheated", "you were wrong", "your score")
- The message should feel like the world noticing something, not an accusation
- It must end with an invitation to slow down or think more carefully, framed positively
- Tone: gentle, caring, like a concerned mentor — never frightening or shaming

Example good tone: "Your Quill's glow has dimmed slightly. True magic comes from understanding, not speed. Take a breath — the Archive Hall will wait for you."

Write the message for the current aura state. Output ONLY the message text, no JSON.`;
}

export function buildRestorationQuestPrompt(): string {
  return `You are the Oracle of the Shadow Vault — the place where mages come to restore their aura.

Create a short Restoration Quest for a student whose aura has been affected by the Shadow Drift.
The quest should consist of 3–5 reflection-style questions that encourage honest thinking and careful reasoning.

These are NOT trick questions. They are reflection prompts about learning habits:
- "Think of a question you got wrong recently. What would you do differently if you tried it again?"
- "If you're not sure of the answer, what's a good strategy to try first?"
- "Why is reading a question slowly better than guessing quickly?"

OUTPUT FORMAT (JSON):
{
  "questTitle": "A poetic title for the restoration quest",
  "introduction": "2–3 sentences of in-world narrative setting the scene",
  "reflections": [
    {
      "prompt": "The reflection question",
      "placeholder": "Suggested starter phrase like 'I would...' or 'When I...'",
      "wisdomEarned": 2
    }
  ],
  "completionMessage": "Short encouraging message when quest is complete (2 sentences)"
}`;
}
