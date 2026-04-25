/**
 * Google Imagen 4 — drop-in replacement for lib/openai.ts
 * Uses the same GOOGLE_AI_KEY as lib/gemini.ts — no separate API key needed.
 *
 * Response is base64 PNG directly in the JSON body (no expiring URL to download).
 */

import * as fs from "fs";
import * as path from "path";

const MODEL = "imagen-4.0-fast-generate-001";

/**
 * Generate a scene image using Imagen 4 and save it locally.
 * Returns the relative URL path (e.g. /writing-images/abc123.png).
 */
export async function generateSceneImage(
  description: string,
  sessionId: string
): Promise<string> {
  const key = process.env.GOOGLE_AI_KEY;
  if (!key) throw new Error("GOOGLE_AI_KEY is not set");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${key}`;

  // Storybook illustration with visual variety — let the scene description drive
  // the colour palette and mood rather than locking to a single dark-blue style.
  const prompt =
    `Children's storybook illustration. Painterly, magical, richly coloured. ` +
    `No text, no words, no letters. No human faces, no people. ` +
    `Evocative scene with atmosphere and colour: ${description}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Imagen 4 error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const b64: string | undefined = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("No image data returned from Imagen 4");

  // Decode base64 and save locally
  const publicDir = path.join(process.cwd(), "public", "writing-images");
  fs.mkdirSync(publicDir, { recursive: true });

  const filename = `${sessionId}.png`;
  fs.writeFileSync(path.join(publicDir, filename), Buffer.from(b64, "base64"));

  return `/writing-images/${filename}`;
}
