import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Simple, minimalist storybook illustration. Soft painterly style, muted magical colours, dark blue background. No text, no words, no people, no faces. Just a single evocative object or simple mood scene: ${description}`,
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

  return `/writing-images/${filename}`;
}
