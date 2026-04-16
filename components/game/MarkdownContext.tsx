"use client";

/**
 * MarkdownContext — renders question context that may contain markdown tables.
 * Handles: plain paragraphs, markdown pipe-tables (GFM).
 * No external dependency required.
 */

import React from "react";

interface MarkdownContextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
  enableCharts?: boolean;
  baseFontSize?: string;
  baseLineHeight?: number;
}

type ChartDatum = { label: string; value: number };
type Block =
  | { type: "table"; rows: string[][]; hasHeader: boolean }
  | { type: "chart"; title?: string; data: ChartDatum[] }
  | { type: "text"; content: string };

function parseChartBlock(text: string): Block | null {
  const compact = text.trim();
  if (!compact) return null;

  const titleMatch = compact.match(/^([^:\n]+):\s*([\s\S]+)$/);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const body = titleMatch ? titleMatch[2].trim() : compact;

  const normalizedBody = body.replace(/\n/g, ", ");
  const parenMatches = Array.from(
    normalizedBody.matchAll(/([A-Za-z][A-Za-z0-9' -]+?)\s*\((\d+)\)/g)
  );
  if (parenMatches.length >= 2) {
    return {
      type: "chart",
      title,
      data: parenMatches.map((match) => ({
        label: match[1].trim(),
        value: parseInt(match[2], 10),
      })),
    };
  }

  const equalsMatches = Array.from(
    normalizedBody.matchAll(/([A-Za-z][A-Za-z0-9' -]+?)\s*=\s*(\d+)/g)
  );
  if (equalsMatches.length >= 2) {
    return {
      type: "chart",
      title,
      data: equalsMatches.map((match) => ({
        label: match[1].trim(),
        value: parseInt(match[2], 10),
      })),
    };
  }

  return null;
}

function parseBlocks(text: string, enableCharts: boolean): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Detect table row: starts and ends with |
    if (/^\|.+\|/.test(line.trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse rows, skip separator lines (--- :---: etc.)
      const isSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());
      const rows = tableLines
        .filter((l) => !isSep(l))
        .map((l) =>
          l
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim())
        );
      // Separator present → first row is header
      const hasHeader = tableLines.some(isSep);
      blocks.push({ type: "table", rows, hasHeader });
    } else {
      // Accumulate non-table lines
      const textLines: string[] = [];
      while (i < lines.length && !/^\|.+\|/.test(lines[i].trim())) {
        textLines.push(lines[i]);
        i++;
      }
      const content = textLines.join("\n").trim();
      if (content) {
        const chartBlock = enableCharts ? parseChartBlock(content) : null;
        blocks.push(chartBlock ?? { type: "text", content });
      }
    }
  }
  return blocks;
}

export default function MarkdownContext({
  text,
  style,
  className,
  enableCharts = true,
  baseFontSize = "1.125rem",
  baseLineHeight = 1.9,
}: MarkdownContextProps) {
  const blocks = parseBlocks(text, enableCharts);

  return (
    <div className={className} style={style}>
      {blocks.map((block, bi) => {
        if (block.type === "text") {
          return (
            <p
              key={bi}
              style={{
                whiteSpace: "pre-wrap",
                marginBottom: "0.75rem",
                fontSize: baseFontSize,
                lineHeight: baseLineHeight,
              }}
            >
              {block.content}
            </p>
          );
        }

        if (block.type === "chart") {
          const maxValue = Math.max(...block.data.map((item) => item.value), 1);
          return (
            <div
              key={bi}
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                borderRadius: "0.9rem",
                background: "#0F1C3F",
                border: "1px solid #B68A3A22",
              }}
            >
              {block.title && (
                <p
                  style={{
                    marginBottom: "0.9rem",
                    color: "#E7C777",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                  }}
                >
                  {block.title}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {block.data.map((item) => (
                  <div key={`${item.label}-${item.value}`}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        marginBottom: "0.25rem",
                        color: "#EADFC8",
                        fontSize: baseFontSize,
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ color: "#E7C777", fontWeight: 700 }}>{item.value}</span>
                    </div>
                    <div
                      style={{
                        height: "0.9rem",
                        borderRadius: "999px",
                        background: "#1E2E5A",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max((item.value / maxValue) * 100, 10)}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background: "linear-gradient(90deg, #6BA3D6, #E7C777)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Table block
        const [header, ...body] = block.hasHeader ? block.rows : [null, ...block.rows];

        return (
          <div key={bi} style={{ marginBottom: "0.75rem" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: baseFontSize,
                tableLayout: "fixed",
              }}
            >
              {header && (
                <thead>
                  <tr>
                    {header.map((cell, ci) => (
                      <th
                        key={ci}
                        style={{
                          padding: "6px 12px",
                          textAlign: "left",
                          borderBottom: "2px solid #B68A3A66",
                          color: "#E7C777",
                          fontWeight: 700,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                          fontSize: baseFontSize,
                        }}
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {(block.hasHeader ? body : block.rows).map((row, ri) => (
                  <tr
                    key={ri}
                    style={{ background: ri % 2 === 0 ? "transparent" : "#EADFC808" }}
                  >
                    {(row ?? []).map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "5px 12px",
                          borderBottom: "1px solid #B68A3A22",
                          color: "#EADFC8",
                          fontSize: baseFontSize,
                          lineHeight: baseLineHeight,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
