"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameNav from "@/components/layout/GameNav";

interface Settings {
  ai_platform?: string;
  openai_api_key?: string;
  google_ai_key?: string;
  openai_text_model?: string;
  openai_image_model?: string;
  gemini_pro_model?: string;
  gemini_flash_model?: string;
}

type TestResult = {
  status: "idle" | "testing" | "ok" | "error";
  message?: string;
  imageUrl?: string;
};

const OPENAI_TEXT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
];

const GEMINI_PRO_MODELS = [
  "gemini-2.5-pro-latest",
  "gemini-pro-latest",
  "gemini-1.5-pro-latest",
];

const GEMINI_FLASH_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-1.5-flash-latest",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [platform, setPlatform] = useState<"openai" | "gemini">("gemini");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiTextModel, setOpenaiTextModel] = useState("gpt-4o");
  const [googleKey, setGoogleKey] = useState("");
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [geminiProModel, setGeminiProModel] = useState("gemini-2.5-pro-latest");
  const [geminiFlashModel, setGeminiFlashModel] = useState("gemini-2.0-flash-lite");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [textTest, setTextTest] = useState<TestResult>({ status: "idle" });
  const [imageTest, setImageTest] = useState<TestResult>({ status: "idle" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        const s: Settings = d.settings || {};
        setSettings(s);
        if (s.ai_platform && s.ai_platform !== "anthropic") setPlatform(s.ai_platform as "openai" | "gemini");
        if (s.openai_text_model) setOpenaiTextModel(s.openai_text_model);
        if (s.gemini_pro_model) setGeminiProModel(s.gemini_pro_model);
        if (s.gemini_flash_model) setGeminiFlashModel(s.gemini_flash_model);
        // Show masked key as placeholder — user must retype to change
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const body: Record<string, string> = {
        ai_platform: platform,
        openai_text_model: openaiTextModel,
        openai_image_model: "dall-e-3",
        gemini_pro_model: geminiProModel,
        gemini_flash_model: geminiFlashModel,
      };
      if (openaiKey.trim() && !openaiKey.includes("…")) {
        body.openai_api_key = openaiKey.trim();
      }
      if (googleKey.trim() && !googleKey.includes("…")) {
        body.google_ai_key = googleKey.trim();
      }

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function testText() {
    setTextTest({ status: "testing" });
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text" }),
      });
      const data = await res.json() as { ok: boolean; response?: string; model?: string; error?: string };
      if (data.ok) {
        setTextTest({
          status: "ok",
          message: `✓ ${data.model} responded: "${data.response}"`,
        });
      } else {
        setTextTest({ status: "error", message: data.error || "Unknown error" });
      }
    } catch (e) {
      setTextTest({ status: "error", message: String(e) });
    }
  }

  async function testImage() {
    setImageTest({ status: "testing" });
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image" }),
      });
      const data = await res.json() as { ok: boolean; imageUrl?: string; error?: string };
      if (data.ok && data.imageUrl) {
        setImageTest({ status: "ok", imageUrl: data.imageUrl, message: "✓ DALL-E 3 image generated" });
      } else {
        setImageTest({ status: "error", message: data.error || "Unknown error" });
      }
    } catch (e) {
      setImageTest({ status: "error", message: String(e) });
    }
  }

  const statusColour = (s: TestResult["status"]) =>
    s === "ok" ? "#22c55e" : s === "error" ? "#ef4444" : "#B68A3A";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-4xl animate-pulse">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "#0F1C3F" }}>
      <GameNav profile={null} />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#E7C777" }}>AI Settings</h1>
          <p style={{ color: "#EADFC8", opacity: 0.7 }}>Configure which AI powers the Archive Hall</p>
        </div>

        {/* Platform selector */}
        <div className="rounded-xl p-6 mb-5 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A44" }}>
          <h2 className="font-bold mb-4" style={{ color: "#E7C777" }}>AI Platform</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: "openai", label: "OpenAI GPT", icon: "🧠", desc: "Single key for text + images" },
              { id: "gemini", label: "Google Gemini", icon: "✨", desc: "Flash + Pro split model" },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => setPlatform(opt.id)}
                className="p-4 rounded-xl text-left transition-all border-2"
                style={{
                  background: platform === opt.id ? "#0F1C3F" : "transparent",
                  borderColor: platform === opt.id ? "#B68A3A" : "#B68A3A33",
                }}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-bold text-sm" style={{ color: platform === opt.id ? "#E7C777" : "#EADFC8" }}>
                  {opt.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#EADFC8", opacity: 0.6 }}>{opt.desc}</div>
                {platform === opt.id && (
                  <div className="text-xs mt-1 font-bold" style={{ color: "#B68A3A" }}>✓ Active</div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "#EADFC8", opacity: 0.5 }}>
            Note: DALL-E image generation always requires an OpenAI key.
          </p>
        </div>

        {/* OpenAI settings */}
        <div className="rounded-xl p-6 mb-5 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A44" }}>
          <h2 className="font-bold mb-4" style={{ color: "#E7C777" }}>🧠 OpenAI</h2>

          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "#B68A3A" }}>
              API Key <span style={{ opacity: 0.6 }}>(required for DALL-E images)</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showOpenaiKey ? "text" : "password"}
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder={settings.openai_api_key || "sk-proj-…"}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
              />
              <button
                onClick={() => setShowOpenaiKey(v => !v)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#B68A3A" }}
              >
                {showOpenaiKey ? "Hide" : "Show"}
              </button>
            </div>
            {settings.openai_api_key && (
              <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                ✓ Key saved ({settings.openai_api_key})
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#B68A3A" }}>Text Model</label>
            <select
              value={openaiTextModel}
              onChange={e => setOpenaiTextModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
            >
              {OPENAI_TEXT_MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gemini settings */}
        <div className="rounded-xl p-6 mb-5 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A44" }}>
          <h2 className="font-bold mb-4" style={{ color: "#E7C777" }}>✨ Google Gemini</h2>

          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "#B68A3A" }}>API Key (GOOGLE_AI_KEY)</label>
            <div className="flex gap-2">
              <input
                type={showGoogleKey ? "text" : "password"}
                value={googleKey}
                onChange={e => setGoogleKey(e.target.value)}
                placeholder={settings.google_ai_key || "AIzaSy…"}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
              />
              <button
                onClick={() => setShowGoogleKey(v => !v)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#B68A3A" }}
              >
                {showGoogleKey ? "Hide" : "Show"}
              </button>
            </div>
            {settings.google_ai_key && (
              <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                ✓ Key saved ({settings.google_ai_key})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#B68A3A" }}>Pro Model <span style={{ opacity: 0.6 }}>(question gen)</span></label>
              <select
                value={geminiProModel}
                onChange={e => setGeminiProModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
              >
                {GEMINI_PRO_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#B68A3A" }}>Flash Model <span style={{ opacity: 0.6 }}>(hints, oracle)</span></label>
              <select
                value={geminiFlashModel}
                onChange={e => setGeminiFlashModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0F1C3F", border: "1px solid #B68A3A44", color: "#EADFC8" }}
              >
                {GEMINI_FLASH_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-base mb-6 transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #B68A3A, #E7C777)", color: "#0F1C3F" }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
        </button>

        {/* Test section */}
        <div className="rounded-xl p-6 border" style={{ background: "#1E2E5A", borderColor: "#B68A3A44" }}>
          <h2 className="font-bold mb-4" style={{ color: "#E7C777" }}>🧪 Test Connections</h2>
          <p className="text-xs mb-4" style={{ color: "#EADFC8", opacity: 0.6 }}>
            Save your settings first, then test each connection.
          </p>

          {/* Text generation test */}
          <div className="mb-4 p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold" style={{ color: "#EADFC8" }}>Text Generation</div>
                <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
                  Tests question generation, hints, Oracle
                </div>
              </div>
              <button
                onClick={testText}
                disabled={textTest.status === "testing"}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: "#B68A3A", color: "#0F1C3F" }}
              >
                {textTest.status === "testing" ? "Testing…" : "Test"}
              </button>
            </div>
            {textTest.status !== "idle" && (
              <div
                className="text-xs p-2 rounded mt-2"
                style={{
                  background: "#1E2E5A",
                  color: statusColour(textTest.status),
                  border: `1px solid ${statusColour(textTest.status)}44`,
                }}
              >
                {textTest.status === "testing" ? (
                  <span className="animate-pulse">⏳ Calling API…</span>
                ) : (
                  textTest.message
                )}
              </div>
            )}
          </div>

          {/* Image generation test */}
          <div className="p-4 rounded-lg" style={{ background: "#0F1C3F" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold" style={{ color: "#EADFC8" }}>Image Generation</div>
                <div className="text-xs" style={{ color: "#EADFC8", opacity: 0.5 }}>
                  Tests DALL-E 3 (OpenAI key required) — costs ~$0.04
                </div>
              </div>
              <button
                onClick={testImage}
                disabled={imageTest.status === "testing"}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: "#B68A3A", color: "#0F1C3F" }}
              >
                {imageTest.status === "testing" ? "Generating…" : "Test"}
              </button>
            </div>
            {imageTest.status !== "idle" && (
              <div
                className="text-xs p-2 rounded mt-2"
                style={{
                  background: "#1E2E5A",
                  color: statusColour(imageTest.status),
                  border: `1px solid ${statusColour(imageTest.status)}44`,
                }}
              >
                {imageTest.status === "testing" ? (
                  <span className="animate-pulse">⏳ Generating image (~15s)…</span>
                ) : (
                  imageTest.message
                )}
              </div>
            )}
            {imageTest.imageUrl && (
              <img
                src={imageTest.imageUrl}
                alt="Test image"
                className="mt-3 w-full rounded-lg"
                style={{ maxHeight: "200px", objectFit: "cover" }}
              />
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/home" className="text-sm" style={{ color: "#B68A3A", opacity: 0.7 }}>
            ← Back to Archive Hall
          </Link>
        </div>
      </div>
    </div>
  );
}
