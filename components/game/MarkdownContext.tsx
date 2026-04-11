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
}

type Block = { type: "table"; rows: string[][]; hasHeader: boolean } | { type: "text"; content: string };

function parseBlocks(text: string): Block[] {
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
      if (content) blocks.push({ type: "text", content });
    }
  }
  return blocks;
}

export default function MarkdownContext({ text, style, className }: MarkdownContextProps) {
  const blocks = parseBlocks(text);

  return (
    <div className={className} style={style}>
      {blocks.map((block, bi) => {
        if (block.type === "text") {
          return (
            <p key={bi} style={{ whiteSpace: "pre-wrap", marginBottom: "0.5rem" }}>
              {block.content}
            </p>
          );
        }

        // Table block
        const [header, ...body] = block.hasHeader ? block.rows : [null, ...block.rows];

        return (
          <div key={bi} style={{ overflowX: "auto", marginBottom: "0.75rem" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
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
                          whiteSpace: "nowrap",
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
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "5px 12px",
                          borderBottom: "1px solid #B68A3A22",
                          color: "#EADFC8",
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
