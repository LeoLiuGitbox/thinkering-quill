/**
 * Google Gemini — drop-in replacement for lib/claude.ts
 *
 * Split model strategy:
 *   chat()    → gemini-flash-lite-latest  (hints, writing feedback, oracle, spells)
 *   chatPro() → gemini-pro-latest         (MCQ generation, AR, RC, exam creation)
 *   stream()  → gemini-flash-lite-latest  (oracle SSE streaming)
 *
 * Both functions retry up to 3× on 503 (high demand) with exponential backoff.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

const flashModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
const proModel   = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (status === 503 && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ─── chat — Flash Lite (fast, cheap) ─────────────────────────────────────────

export async function chat(
  system: string,
  user: string,
  maxTokens = 4096
): Promise<string> {
  return withRetry(async () => {
    const result = await flashModel.generateContent({
      systemInstruction: system,
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text();
  });
}

// ─── chatPro — Gemini Pro (kept for future use / fallback) ───────────────────

export async function chatPro(
  system: string,
  user: string,
  maxTokens = 8192
): Promise<string> {
  return withRetry(async () => {
    const result = await proModel.generateContent({
      systemInstruction: system,
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text();
  });
}

// ─── chatFlash — Flash Latest (fast structured output for question generation)

const flashLatestModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export async function chatFlash(
  system: string,
  user: string,
  maxTokens = 8192
): Promise<string> {
  return withRetry(async () => {
    const result = await flashLatestModel.generateContent({
      systemInstruction: system,
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    return result.response.text();
  });
}

// ─── stream — Flash Lite streaming for Oracle SSE ────────────────────────────

export async function* stream(
  system: string,
  userMessages: { role: "user" | "model"; content: string }[],
  maxTokens = 2048
): AsyncGenerator<string> {
  const result = await withRetry(() =>
    flashModel.generateContentStream({
      systemInstruction: system,
      contents: userMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    })
  );
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
