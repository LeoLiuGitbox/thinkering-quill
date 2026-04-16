"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameNav from "@/components/layout/GameNav";
import ChallengeLogMarkdown from "@/components/logs/ChallengeLogMarkdown";

type Profile = {
  id: number;
  mageName: string;
  totalXP: number;
  rank: string;
  avatarColour: string;
};

type ChallengeLogListItem = {
  fileName: string;
  title: string;
  updatedAt: string;
  sizeBytes: number;
};

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChallengeLogReviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ChallengeLogListItem[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const profileId = localStorage.getItem("activeProfileId");
    if (!profileId) {
      router.push("/login");
      return;
    }

    void Promise.all([
      fetch(`/api/profile/${profileId}`).then((res) => res.json()),
      fetch("/api/challenge-logs").then((res) => res.json()),
    ])
      .then(([profileData, logData]) => {
        setProfile(profileData.profile ?? profileData);
        const nextLogs = logData.logs ?? [];
        setLogs(nextLogs);
        if (nextLogs[0]?.fileName) {
          setSelectedFile(nextLogs[0].fileName);
        }
      })
      .catch((err) => {
        console.error("Failed to load challenge logs:", err);
        setError("Failed to load challenge logs.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedContent("");
      return;
    }

    setContentLoading(true);
    setError("");
    void fetch(`/api/challenge-logs/${encodeURIComponent(selectedFile)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setSelectedContent(data.content ?? "");
      })
      .catch((err) => {
        console.error("Failed to load challenge log content:", err);
        setError("Failed to load selected challenge log.");
        setSelectedContent("");
      })
      .finally(() => setContentLoading(false));
  }, [selectedFile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1C3F" }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📜</div>
          <p style={{ color: "#B68A3A" }}>Opening the challenge archive…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0F1C3F" }}>
      <GameNav profile={profile} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 text-sm mb-3 transition-opacity hover:opacity-80"
              style={{ color: "#B68A3A" }}
            >
              ← Back to Vault
            </Link>
            <h1
              className="text-3xl font-bold"
              style={{ color: "#E7C777", fontFamily: "Georgia, serif" }}
            >
              Challenge Log Review
            </h1>
            <p style={{ color: "#EADFC8", opacity: 0.74 }}>
              Browse saved quest and writing logs, then review the markdown-rendered record on the right.
            </p>
          </div>
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22", color: "#EADFC8" }}
          >
            {logs.length} log{logs.length === 1 ? "" : "s"}
          </div>
        </div>

        {error ? (
          <div
            className="mb-6 rounded-2xl px-4 py-3"
            style={{ background: "#3A1F1F", border: "1px solid #C84B31", color: "#F4D7D7" }}
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className="rounded-3xl p-4"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22" }}
          >
            <p
              className="text-xs uppercase tracking-[0.24em] mb-4"
              style={{ color: "#B68A3A" }}
            >
              Log Files
            </p>

            {logs.length === 0 ? (
              <div
                className="rounded-2xl p-5 text-sm"
                style={{ background: "#16213B", color: "#EADFC8", opacity: 0.78 }}
              >
                No challenge logs found yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {logs.map((log) => {
                  const active = selectedFile === log.fileName;
                  return (
                    <button
                      key={log.fileName}
                      onClick={() => setSelectedFile(log.fileName)}
                      className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                      style={{
                        background: active ? "#24386A" : "#16213B",
                        border: `1px solid ${active ? "#E7C777" : "#B68A3A22"}`,
                      }}
                    >
                      <p
                        className="font-bold mb-1"
                        style={{ color: active ? "#E7C777" : "#EADFC8", fontFamily: "Georgia, serif" }}
                      >
                        {log.title}
                      </p>
                      <p className="text-xs mb-1" style={{ color: "#B68A3A" }}>
                        {formatUpdatedAt(log.updatedAt)}
                      </p>
                      <p className="text-xs break-all" style={{ color: "#EADFC8", opacity: 0.6 }}>
                        {log.fileName}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#EADFC8", opacity: 0.45 }}>
                        {formatSize(log.sizeBytes)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section
            className="rounded-3xl p-6 min-h-[70vh]"
            style={{ background: "#1A2545", border: "1px solid #B68A3A22" }}
          >
            {contentLoading ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-5xl mb-4">📖</div>
                  <p style={{ color: "#B68A3A" }}>Loading selected log…</p>
                </div>
              </div>
            ) : selectedContent ? (
              <ChallengeLogMarkdown content={selectedContent} />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-5xl mb-4">🗂️</div>
                  <p style={{ color: "#EADFC8", opacity: 0.75 }}>
                    Choose a log from the file list to review it here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
