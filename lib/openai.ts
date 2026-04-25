import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Lazy singleton — only instantiated when actually called, so missing key
// during build-time static analysis doesn't crash the build.
let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

/**
 * Generate text using GPT-4o-mini.
 * Drop-in replacement for the Gemini chat() function.
 */
export async function chatOpenAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.9,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Generate a DALL-E 3 image from a description and save it locally.
 * Returns the relative URL path (e.g. /writing-images/abc123.png).
 */
export async function generateSceneImage(
  description: string,
  sessionId: string
): Promise<string> {
  // Keep images simple and abstract — evoke a mood or single object only.
  // Complex scenes give too many writing hints and constrain the child's imagination.
  const response = await getClient().images.generate({
    model: "dall-e-3",
    prompt: `Children's storybook illustration. Painterly, magical, richly coloured. No text, no words, no letters. No human faces, no people. Evocative scene with atmosphere and colour: ${description}`,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  const imageUrl = (response.data ?? [])[0]?.url;
  if (!imageUrl) throw new Error("No image URL returned from DALL-E");

  // Save image locally (DALL-E URLs expire in 1 hour)
  const publicDir = path.join(process.cwd(), "public", "writing-images");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filename = `${sessionId}.png`;
  const filePath = path.join(publicDir, filename);

  const imageResponse = await fetch(imageUrl);
  const buffer = await imageResponse.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  // Use the API route, not /writing-images/, because Next.js production
  // only serves files that existed in public/ at build time.
  return `/api/writing-image/${filename}`;
}
