import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_KEYS = [
  "ai_platform",        // "anthropic" | "openai"
  "anthropic_api_key",
  "openai_api_key",
  "anthropic_model",    // e.g. "claude-sonnet-4-5"
  "openai_text_model",  // e.g. "gpt-4o"
  "openai_image_model", // e.g. "dall-e-3"
];

/** GET /api/settings — returns all settings (keys only, values masked for API keys) */
export async function GET() {
  try {
    const rows = await prisma.appSettings.findMany();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key.endsWith("_api_key") && row.value) {
        // Mask key: show first 8 + last 4 chars
        const v = row.value;
        settings[row.key] = v.length > 12
          ? v.slice(0, 8) + "…" + v.slice(-4)
          : "••••••••";
      } else {
        settings[row.key] = row.value;
      }
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/** PUT /api/settings — upsert one or more settings */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;
    const updated: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      await prisma.appSettings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      updated.push(key);
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

/** POST /api/settings/test — test an API key by making a real call */
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json() as { type: "text" | "image" };

    // Read actual key from DB (unmasked)
    const rows = await prisma.appSettings.findMany();
    const s: Record<string, string> = {};
    for (const r of rows) s[r.key] = r.value;

    const platform = s.ai_platform || "anthropic";

    if (type === "text") {
      if (platform === "anthropic") {
        const key = s.anthropic_api_key;
        if (!key) return NextResponse.json({ ok: false, error: "No Anthropic API key saved" });

        const model = s.anthropic_model || "claude-sonnet-4-5";
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 64,
            messages: [{ role: "user", content: "Reply with exactly: TEST_OK" }],
          }),
        });
        const data = await res.json() as { content?: {text: string}[]; error?: {message: string} };
        if (!res.ok) return NextResponse.json({ ok: false, error: data.error?.message || "API error" });
        const text = data.content?.[0]?.text || "";
        return NextResponse.json({ ok: true, response: text.trim(), model, platform });

      } else {
        // OpenAI
        const key = s.openai_api_key;
        if (!key) return NextResponse.json({ ok: false, error: "No OpenAI API key saved" });

        const model = s.openai_text_model || "gpt-4o-mini";
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            model,
            max_tokens: 64,
            messages: [{ role: "user", content: "Reply with exactly: TEST_OK" }],
          }),
        });
        const data = await res.json() as { choices?: {message: {content: string}}[]; error?: {message: string} };
        if (!res.ok) return NextResponse.json({ ok: false, error: data.error?.message || "API error" });
        const text = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({ ok: true, response: text.trim(), model, platform });
      }
    }

    if (type === "image") {
      const key = s.openai_api_key;
      if (!key) return NextResponse.json({ ok: false, error: "No OpenAI API key saved (DALL-E requires OpenAI)" });

      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: "A single glowing golden feather quill on a dark blue background. Minimal, simple.",
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url",
        }),
      });

      // Read as text first to avoid crash on empty/non-JSON body
      const raw = await res.text();
      let data: { data?: { url: string }[]; error?: { message: string } } = {};
      try { data = JSON.parse(raw); } catch {
        return NextResponse.json({ ok: false, error: `Unexpected response (HTTP ${res.status}): ${raw.slice(0, 200)}` });
      }
      if (!res.ok) return NextResponse.json({ ok: false, error: data.error?.message || `HTTP ${res.status}` });
      return NextResponse.json({ ok: true, imageUrl: data.data?.[0]?.url, platform: "openai" });
    }

    return NextResponse.json({ error: "Unknown test type" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/settings/test error:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}
