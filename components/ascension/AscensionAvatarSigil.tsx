"use client";

import { AscensionRankMeta } from "@/lib/ascension";

export default function AscensionAvatarSigil({
  meta,
  locked = false,
  size = 136,
}: {
  meta: AscensionRankMeta;
  locked?: boolean;
  size?: number;
}) {
  const orbSize = Math.round(size * 0.68);

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: locked ? "linear-gradient(135deg, #1A2545, #0F1C3F)" : meta.aura,
          boxShadow: locked ? "none" : `0 0 40px ${meta.colour}44`,
          animation: locked ? undefined : "ascension-breathe 3.8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          border: `2px solid ${locked ? "#B68A3A33" : meta.colour}`,
          animation: locked ? undefined : "ascension-spin 10s linear infinite",
        }}
      />
      <div
        className="absolute inset-[20%] rounded-full"
        style={{
          border: `1px dashed ${locked ? "#B68A3A22" : meta.accent}`,
          animation: locked ? undefined : "ascension-spin-reverse 13s linear infinite",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full flex items-center justify-center text-5xl font-bold"
        style={{
          width: orbSize,
          height: orbSize,
          transform: "translate(-50%, -50%)",
          background: locked ? "#16213B" : "rgba(15, 28, 63, 0.68)",
          color: locked ? "#B68A3A66" : meta.colour,
          border: `2px solid ${locked ? "#B68A3A22" : meta.accent}`,
          boxShadow: locked ? "none" : `inset 0 0 25px ${meta.colour}22`,
          filter: locked ? "grayscale(1) blur(0.5px)" : "none",
        }}
      >
        {locked ? "🔒" : meta.sigil}
      </div>

      {!locked && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              width: 10,
              height: 10,
              left: "12%",
              top: "18%",
              background: meta.accent,
              boxShadow: `0 0 16px ${meta.accent}`,
              animation: "ascension-float 4.2s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              right: "14%",
              bottom: "22%",
              background: meta.colour,
              boxShadow: `0 0 14px ${meta.colour}`,
              animation: "ascension-float 5.3s ease-in-out infinite reverse",
            }}
          />
        </>
      )}

      <style>{`
        @keyframes ascension-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ascension-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes ascension-breathe {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes ascension-float {
          0%, 100% { transform: translateY(0px); opacity: 0.8; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
