"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GameNav from "@/components/layout/GameNav";
import QuestReviewCards from "@/components/quest/QuestReviewCards";
import { QuestReviewPayload } from "@/types/game";

export default function QuestReviewPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [review, setReview] = useState<QuestReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const profileId = localStorage.getItem("activeProfileId");
        if (!profileId) {
          router.push("/login");
          return;
        }

        const [profileRes, reviewRes] = await Promise.all([
          fetch(`/api/profile/${profileId}`),
          fetch(`/api/quest/session/${params.sessionId}`),
        ]);

        const profileData = await profileRes.json();
        const reviewData = await reviewRes.json();

        if (!profileRes.ok) throw new Error("Failed to load profile");
        if (!reviewRes.ok) throw new Error(reviewData.error || "Failed to load review");

        setProfile(profileData.profile);
        setReview(reviewData);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load quest review");
      } finally {
        setLoading(false);
      }
    }

    if (params.sessionId) load();
  }, [params.sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">📚</div>
          <p style={{ color: "#EADFC8" }}>Loading your quest review…</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="max-w-md p-6 rounded-2xl text-center" style={{ background: "#1E2E5A", border: "1px solid #B68A3A44" }}>
          <p className="text-xl font-bold mb-2" style={{ color: "#E7C777" }}>Quest review unavailable</p>
          <p className="text-sm mb-6" style={{ color: "#EADFC8", opacity: 0.75 }}>
            {error ?? "This quest review could not be loaded."}
          </p>
          <Link
            href="/home"
            className="px-5 py-2 rounded-xl font-semibold"
            style={{ background: "#B68A3A", color: "#0F1C3F" }}
          >
            Return to Archive Hall
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#B68A3A" }}>
              Saved Quest Review
            </p>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}>
              {review.session.region}
            </h1>
            <p style={{ color: "#EADFC8", opacity: 0.78 }}>
              {review.session.correctCount} / {review.session.questionCount} correct · +{review.session.totalSparks} ✦
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/quest/${encodeURIComponent(String(review.session.region))}`}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#1E2E5A", color: "#6BA3D6", border: "1px solid #6BA3D6" }}
            >
              Region Hub
            </Link>
            <Link
              href="/home"
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#B68A3A", color: "#0F1C3F" }}
            >
              Archive Hall
            </Link>
          </div>
        </div>

        {review.recommendedNextFocus.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl" style={{ background: "#16213B", border: "1px solid #2E5A8E55" }}>
            <h2 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#6BA3D6" }}>
              Recommended next focus
            </h2>
            <div className="space-y-2">
              {review.recommendedNextFocus.map((item) => (
                <p key={item.code} className="text-sm" style={{ color: "#EADFC8" }}>
                  <span style={{ color: "#E7C777" }}>{item.code}</span> · {item.label}
                </p>
              ))}
            </div>
          </div>
        )}

        <QuestReviewCards
          items={review.attempts.map((attempt, index) => ({
            ...attempt,
            order: index + 1,
          }))}
        />
      </main>
    </div>
  );
}
