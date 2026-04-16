"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    title: "The Archive Hall calls to you…",
    body: "Long ago, a single Quill was forged from starlight and ancient ink. It has been waiting — for a mind curious enough to wield it.",
    emoji: "📜",
  },
  {
    title: "Your Thinkering Quill awakens",
    body: "This is no ordinary quill. It grows with every challenge you complete — and it can only be wielded with honest thought. No shortcuts. No rushing. Pure thinking.",
    emoji: "🪶",
  },
  {
    title: "The Archive Hall is yours to explore",
    body: "Four great regions await: the Clocktower of Logic, the Forest of Patterns, the Lake of Reflection, and the Workshop of Runes. Each holds ancient knowledge — and secrets.",
    emoji: "🗺️",
  },
  {
    title: "Your journey begins",
    body: "You are now a Novice Scribe. With every spell mastered, your rank rises through the Mage Ascension Hall — and one day, you may stand as an Eternal Luminary. Are you ready?",
    emoji: "✨",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [profileName, setProfileName] = useState("Mage");

  useEffect(() => {
    const name = localStorage.getItem("activeProfileName");
    if (name) setProfileName(name);
  }, []);

  function nextStep() {
    setVisible(false);
    setTimeout(() => {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
        setVisible(true);
      } else {
        router.push("/home");
      }
    }, 300);
  }

  const current = STEPS[step];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "linear-gradient(135deg, #0F1C3F 0%, #1A2550 50%, #0F1C3F 100%)" }}
    >
      {/* Stars background (decorative) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: Math.random() * 3 + "s",
            }}
          />
        ))}
      </div>

      <div
        className="relative max-w-lg w-full text-center transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}
      >
        {/* Step emoji */}
        <div className="text-8xl mb-8" style={{ filter: "drop-shadow(0 0 20px rgba(231, 199, 119, 0.6))" }}>
          {current.emoji}
        </div>

        {/* Mage greeting on first step */}
        {step === 0 && (
          <p className="text-lg mb-4" style={{ color: "#B68A3A" }}>
            Welcome, {profileName}…
          </p>
        )}

        {/* Title */}
        <h1
          className="text-3xl font-bold mb-6"
          style={{
            color: "#E7C777",
            textShadow: "0 0 30px rgba(231, 199, 119, 0.4)",
            fontFamily: "Georgia, serif",
            lineHeight: 1.4,
          }}
        >
          {current.title}
        </h1>

        {/* Body */}
        <p
          className="text-lg leading-relaxed mb-10"
          style={{ color: "#EADFC8", opacity: 0.85, fontFamily: "Georgia, serif" }}
        >
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "8px",
                height: "8px",
                background: i === step ? "#E7C777" : "#B68A3A44",
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={nextStep}
          className="px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-200 hover:scale-105 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #B68A3A, #E7C777)",
            color: "#0F1C3F",
            fontFamily: "Georgia, serif",
            boxShadow: "0 4px 20px rgba(231, 199, 119, 0.4)",
          }}
        >
          {step < STEPS.length - 1 ? "Continue →" : "Enter the Archive Hall ✨"}
        </button>
      </div>
    </div>
  );
}
