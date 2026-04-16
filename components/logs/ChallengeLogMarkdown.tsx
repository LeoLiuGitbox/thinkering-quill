"use client";

import React from "react";
import MarkdownContext from "@/components/game/MarkdownContext";

type Block =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "quote"; content: string }
  | { type: "table"; content: string }
  | { type: "code"; language: string; content: string }
  | { type: "rule" }
  | { type: "details"; summary: string; content: string }
  | { type: "image"; alt: string; src: string }
  | { type: "list"; ordered: boolean; items: string[] };

function normalizeImageSrc(src: string) {
  if (src.includes("/public/")) {
    return src.slice(src.indexOf("/public/") + "/public".length);
  }
  if (src.startsWith("../../public/")) {
    return src.replace("../../public", "");
  }
  return src;
}

function renderInline(text: string) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={index}
          style={{
            background: "#0F1C3F",
            color: "#E7C777",
            padding: "0.12rem 0.35rem",
            borderRadius: "0.35rem",
            fontSize: "0.95em",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }

    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*)\]\((.+)\)$/);
    if (imageMatch) {
      blocks.push({
        type: "image",
        alt: imageMatch[1] || "Challenge log image",
        src: normalizeImageSrc(imageMatch[2]),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith("<details><summary>")) {
      const summary = trimmed
        .replace("<details><summary>", "")
        .replace("</summary>", "")
        .trim();
      const detailLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "</details>") {
        detailLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim() === "</details>") i++;
      blocks.push({
        type: "details",
        summary,
        content: detailLines.join("\n").trim(),
      });
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({
        type: "code",
        language,
        content: codeLines.join("\n"),
      });
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", content: tableLines.join("\n") });
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", content: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("<details><summary>") &&
      !/^!\[.*\]\(.+\)$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    blocks.push({ type: "paragraph", content: paragraphLines.join("\n").trim() });
  }

  return blocks;
}

export default function ChallengeLogMarkdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const sizes = ["2rem", "1.5rem", "1.25rem", "1.1rem", "1rem", "0.95rem"];
          return (
            <h2
              key={index}
              style={{
                color: "#E7C777",
                fontFamily: "Georgia, serif",
                fontSize: sizes[Math.min(block.level - 1, sizes.length - 1)],
                fontWeight: 700,
                marginTop: block.level === 1 ? "0.5rem" : "0",
              }}
            >
              {renderInline(block.content)}
            </h2>
          );
        }

        if (block.type === "rule") {
          return keyLine(index);
        }

        if (block.type === "table") {
          return (
            <MarkdownContext
              key={index}
              text={block.content}
              style={{ color: "#EADFC8" }}
            />
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              style={{
                borderLeft: "3px solid rgba(231, 199, 119, 0.45)",
                paddingLeft: "1rem",
                color: "#EADFC8",
                fontFamily: "Georgia, serif",
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
              }}
            >
              {renderInline(block.content)}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <div key={index}>
              {block.language ? (
                <p
                  className="text-xs uppercase tracking-[0.18em] mb-2"
                  style={{ color: "#B68A3A" }}
                >
                  {block.language}
                </p>
              ) : null}
              <pre
                style={{
                  background: "#0F1C3F",
                  color: "#EADFC8",
                  border: "1px solid #B68A3A22",
                  borderRadius: "1rem",
                  padding: "1rem",
                  overflowX: "auto",
                  lineHeight: 1.65,
                  fontSize: "0.95rem",
                }}
              >
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "details") {
          return (
            <details
              key={index}
              style={{
                background: "#16213B",
                border: "1px solid #B68A3A22",
                borderRadius: "1rem",
                padding: "0.9rem 1rem",
              }}
            >
              <summary
                style={{
                  color: "#E7C777",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {block.summary}
              </summary>
              <div className="mt-4">
                <ChallengeLogMarkdown content={block.content} />
              </div>
            </details>
          );
        }

        if (block.type === "image") {
          return (
            <div key={index} className="rounded-2xl overflow-hidden" style={{ border: "1px solid #B68A3A22" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.src} alt={block.alt} style={{ width: "100%", display: "block" }} />
            </div>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className={block.ordered ? "list-decimal" : "list-disc"}
              style={{
                color: "#EADFC8",
                paddingLeft: "1.4rem",
                lineHeight: 1.8,
                fontFamily: "Georgia, serif",
              }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </Tag>
          );
        }

        return (
          <div
            key={index}
            style={{
              color: "#EADFC8",
              fontFamily: "Georgia, serif",
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
              fontSize: "1.05rem",
            }}
          >
            {renderInline(block.content)}
          </div>
        );
      })}
    </div>
  );
}

function keyLine(key: number) {
  return (
    <div
      key={key}
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(231, 199, 119, 0.45), transparent)",
      }}
    />
  );
}
