/**
 * Google Gemini — drop-in replacement for lib/claude.ts
 *
 * Split model strategy:
 *   chat()    → gemini-2.0-flash  (hints, writing feedback, oracle, spells)
 *   chatPro() → gemini-2.5-pro    (MCQ generation, AR, RC, exam creation)
 *   stream()  → gemini-2.0-flash  (oracle SSE streaming)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const proModel   = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// ─── chat — Flash (fast, cheap) ───────────────────────────────────────────────

export async function chat(
  system: string,
  user: string,
  maxTokens = 4096
): Promise<string> {
  const result = await flashModel.generateContent({
    systemInstruction: system,
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  });
  return result.response.text();
}

// ─── chatPro — 2.5 Pro (complex structured output) ───────────────────────────

export async function chatPro(
  system: string,
  user: string,
  maxTokens = 8192
): Promise<string> {
  const result = await proModel.generateContent({
    systemInstruction: system,
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  });
  return result.response.text();
}

// ─── stream — Flash streaming for Oracle SSE ─────────────────────────────────

export async function* stream(
  system: string,
  userMessages: { role: "user" | "model"; content: string }[],
  maxTokens = 2048
): AsyncGenerator<string> {
  const result = await flashModel.generateContentStream({
    systemInstruction: system,
    contents: userMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: maxTokens },
  });
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// ─── parseJSON — pure utility, no API call ────────────────────────────────────

export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
