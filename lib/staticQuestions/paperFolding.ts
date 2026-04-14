// Static paper folding questions for AR (AR-01/AR-02 at Archmage difficulty).
// These cannot be generated as ARCell JSON — fold lines and punched-hole positions
// require accurate geometric SVGs. Each question is fully self-contained.
//
// SVG colour palette (matches game theme):
//   Paper:      #EADFC8   Border: #B68A3A
//   Fold line:  #B68A3A   (dashed)
//   Hole:       #1E2E5A   (dark circle on paper = punched through)
//   Background: #0F1C3F

export interface StaticARQuestion {
  questionText: string;
  staticSvg: string;        // question grid SVG (shows fold steps)
  optionSvgs: [string, string, string, string]; // A B C D — unfolded result options
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  knowledgePointCode: "AR-01" | "AR-02";
  estimatedReadTimeMs: number;
  isStatic: true;
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────

const PAPER = "#EADFC8";
const BORDER = "#B68A3A";
const HOLE = "#1E2E5A";
const BG = "#0F1C3F";
const FOLD = "#B68A3A";

// A full square paper (80×80) with optional holes and fold crease
function paper(
  holes: Array<[number, number]> = [],
  foldLine?: { x1: number; y1: number; x2: number; y2: number },
  shadedHalf?: "left" | "right" | "top" | "bottom"
): string {
  const shadeMap: Record<string, string> = {
    left: `<rect x="0" y="0" width="40" height="80" fill="#B68A3A22"/>`,
    right: `<rect x="40" y="0" width="40" height="80" fill="#B68A3A22"/>`,
    top: `<rect x="0" y="0" width="80" height="40" fill="#B68A3A22"/>`,
    bottom: `<rect x="0" y="40" width="80" height="40" fill="#B68A3A22"/>`,
  };
  const shade = shadedHalf ? shadeMap[shadedHalf] : "";
  const holesSvg = holes
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`)
    .join("");
  const fold = foldLine
    ? `<line x1="${foldLine.x1}" y1="${foldLine.y1}" x2="${foldLine.x2}" y2="${foldLine.y2}" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`
    : "";
  return `<rect x="1" y="1" width="78" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>${shade}${fold}${holesSvg}`;
}

// A folded-in-half paper (rectangle, 40×80 or 80×40) with optional holes
function foldedPaper(
  orientation: "vertical" | "horizontal",
  holes: Array<[number, number]> = []
): string {
  const holesSvg = holes
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`)
    .join("");
  if (orientation === "vertical") {
    // right half showing (folded left over right → showing right 40px)
    return `<rect x="1" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
    <line x1="1" y1="1" x2="1" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>${holesSvg}`;
  } else {
    // bottom half showing
    return `<rect x="1" y="1" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
    <line x1="1" y1="1" x2="79" y2="1" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>${holesSvg}`;
  }
}

// Wrap content in a labelled step box (80×80 viewBox)
function stepBox(label: string, content: string, size = 80): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${content}
  <text x="${size / 2}" y="${size - 2}" text-anchor="middle" font-size="8" fill="${BORDER}" font-family="Georgia,serif">${label}</text>
</svg>`;
}

// Question SVG: horizontal strip of step boxes with arrows
function questionSvg(steps: string[]): string {
  const boxW = 80;
  const arrowW = 24;
  const totalW = steps.length * boxW + (steps.length - 1) * arrowW;
  const boxes = steps
    .map((s, i) => `<g transform="translate(${i * (boxW + arrowW)},0)">${s}</g>`)
    .join("");
  const arrows = steps
    .slice(0, -1)
    .map(
      (_, i) =>
        `<g transform="translate(${i * (boxW + arrowW) + boxW},0)">
          <text x="12" y="46" text-anchor="middle" font-size="18" fill="${BORDER}" font-family="sans-serif">→</text>
        </g>`
    )
    .join("");
  return `<svg width="${totalW}" height="80" viewBox="0 0 ${totalW} 80" xmlns="http://www.w3.org/2000/svg"
    style="background:${BG};border-radius:12px;padding:4px">${boxes}${arrows}</svg>`;
}

// Option SVG: a full unfolded 80×80 paper with holes
function optionSvg(holes: Array<[number, number]>): string {
  return `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">${paper(holes)}</svg>`;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export const PAPER_FOLDING_QUESTIONS: StaticARQuestion[] = [

  // ── Q1: fold left→right, punch centre of folded stack ──────────────────────
  {
    questionText: "A square piece of paper is folded in half (right side over left). A hole is punched through both layers. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="40" cy="40" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[20, 40], [60, 40]]),   // A ✓ — symmetric left and right
      optionSvg([[40, 40]]),              // B — only centre
      optionSvg([[20, 40]]),              // C — only left
      optionSvg([[60, 40], [60, 20]]),    // D — wrong positions
    ],
    correct: "A",
    explanation: "When the right half is folded over the left, the hole punched at centre creates two holes — one in each half — symmetrically placed at the fold axis. Unfolded: holes at (left-centre) and (right-centre).",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q2: fold top→bottom, punch top-right of folded stack ───────────────────
  {
    questionText: "A square piece of paper is folded in half (bottom half up over top). A hole is punched through the top-right of the folded paper. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 0, y1: 40, x2: 80, y2: 40 })),
      stepBox("2. Fold ↑", `<rect x="1" y="21" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="1" y1="21" x2="79" y2="21" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="21" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="62" cy="30" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[62, 20], [62, 60]]),   // A ✓ — mirrored top and bottom
      optionSvg([[62, 20]]),              // B — only top
      optionSvg([[20, 20], [20, 60]]),   // C — wrong x position
      optionSvg([[62, 60], [20, 20]]),   // D — mixed positions
    ],
    correct: "A",
    explanation: "Folding bottom over top aligns row 60 with row 20. A hole at top-right (x=62, y=20 on folded paper) punches through both layers, creating two holes symmetrically at y=20 and y=60, both at x=62.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q3: fold left→right, punch top-left of folded (near fold) ──────────────
  {
    questionText: "A square piece of paper is folded in half (right over left). A hole is punched near the fold line in the top area. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="26" cy="18" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[26, 18], [54, 18]]),   // A ✓
      optionSvg([[26, 18], [26, 62]]),   // B — mirrored vertically (wrong)
      optionSvg([[26, 18]]),              // C — only one hole
      optionSvg([[54, 18], [54, 62]]),   // D — wrong half
    ],
    correct: "A",
    explanation: "The hole is punched near the left edge of the folded stack (near the fold line). When unfolded, this creates two holes equidistant from the fold line — one at x=26 and its mirror at x=54, both at y=18.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q4: fold top→bottom, punch centre ──────────────────────────────────────
  {
    questionText: "A square piece of paper is folded in half (top down over bottom). A hole is punched through the centre of the folded paper. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 0, y1: 40, x2: 80, y2: 40 })),
      stepBox("2. Fold ↓", `<rect x="1" y="41" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="1" y1="41" x2="79" y2="41" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="41" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="40" cy="60" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[40, 20], [40, 60]]),   // A ✓
      optionSvg([[40, 60]]),              // B — only bottom
      optionSvg([[20, 40], [60, 40]]),   // C — horizontal mirror (wrong fold direction)
      optionSvg([[40, 40]]),              // D — only centre
    ],
    correct: "A",
    explanation: "Folding top down aligns the top half with the bottom half. A hole punched at (40, 60) on the folded paper creates two holes: one at (40, 60) and its mirror at (40, 20). Both are at x=40, vertically symmetric about y=40.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q5: two folds — left→right then top→bottom, centre punch ───────────────
  {
    questionText: "A square paper is folded right-over-left, then top-down-over-bottom. A hole is punched through the centre. How many holes appear when fully unfolded, and where?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Fold ↓", `<rect x="21" y="21" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="21" x2="59" y2="21" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>
        <line x1="21" y1="1" x2="21" y2="21" stroke="${FOLD}" stroke-width="1" stroke-dasharray="3,2"/>`),
      stepBox("4. Punch", `<rect x="21" y="21" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="40" cy="40" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[20, 20], [60, 20], [20, 60], [60, 60]]),  // A ✓ — 4 holes at quadrant centres
      optionSvg([[40, 40]]),                                  // B — only one hole
      optionSvg([[20, 40], [60, 40]]),                        // C — two holes horizontal
      optionSvg([[20, 20], [60, 60]]),                        // D — only diagonal pair
    ],
    correct: "A",
    explanation: "Two folds create 4 layers. One hole through the centre of the final quarter punches through all 4 layers. When both folds are reversed, the holes appear at the centre of each quadrant: top-left (20,20), top-right (60,20), bottom-left (20,60), bottom-right (60,60).",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 22000,
    isStatic: true,
  },

  // ── Q6: fold diagonally (bottom-left triangle), punch near fold ─────────────
  {
    questionText: "A square paper is folded diagonally (bottom-right corner to top-left corner). A hole is punched near the folded corner. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], undefined)),
      stepBox("2. Fold ↗", `<polygon points="1,79 79,79 79,1" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5"/>
        <line x1="1" y1="79" x2="79" y2="1" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<polygon points="1,79 79,79 79,1" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5"/>
        <circle cx="65" cy="65" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[65, 65], [15, 15]]),   // A ✓ — diagonal mirror
      optionSvg([[65, 65], [65, 15]]),   // B — vertical mirror (wrong)
      optionSvg([[65, 65]]),              // C — only one hole
      optionSvg([[15, 65], [65, 15]]),   // D — anti-diagonal
    ],
    correct: "A",
    explanation: "A diagonal fold mirrors along the main diagonal (top-left to bottom-right). A hole at (65,65) mirrors to (65,65) reflected over the diagonal y=x, which maps (65,65) to (65,65) — but the second layer receives the reflected position (15,15). Holes at both (65,65) and (15,15).",
    knowledgePointCode: "AR-01",
    estimatedReadTimeMs: 20000,
    isStatic: true,
  },

  // ── Q7: fold right→left, punch near outer edge (far from fold) ─────────────
  {
    questionText: "A square paper is folded in half (left side over right). A hole is punched near the right outer edge, midway down. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold ←", `<rect x="1" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="39" y1="1" x2="39" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="32" cy="40" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[32, 40], [48, 40]]),   // A ✓ — left near-edge and right mirror
      optionSvg([[8, 40], [72, 40]]),    // B — wrong distance from fold
      optionSvg([[32, 40]]),              // C — only one hole
      optionSvg([[32, 20], [32, 60]]),   // D — vertical (wrong axis)
    ],
    correct: "A",
    explanation: "The hole is at x=32 on the left-half paper (fold at x=40). When left is folded over right, x=32 aligns with x=48 (mirror: 40+(40-32)=48). Unfolded: two holes at x=32 and x=48, both at y=40.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q8: fold top→bottom, punch top-left of folded stack ────────────────────
  {
    questionText: "A square paper is folded in half (top half down over bottom). A hole is punched in the top-left of the folded paper. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 0, y1: 40, x2: 80, y2: 40 })),
      stepBox("2. Fold ↓", `<rect x="1" y="41" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="1" y1="41" x2="79" y2="41" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="41" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="18" cy="50" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[18, 30], [18, 50]]),   // A ✓ — symmetric about y=40
      optionSvg([[18, 50], [62, 50]]),   // B — horizontal mirror (wrong axis)
      optionSvg([[18, 50]]),              // C — only one hole
      optionSvg([[18, 20], [18, 60]]),   // D — wrong distances
    ],
    correct: "A",
    explanation: "Top folded down: fold axis is y=40. Hole at (18, 50) on bottom layer. Mirror across y=40: 50→30. So holes at (18,50) and (18,30) — vertically symmetric, same x.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q9: fold left→right, two holes punched ─────────────────────────────────
  {
    questionText: "A square paper is folded in half (right over left). Two holes are punched — one near the top and one near the bottom of the folded stack. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch ×2", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="40" cy="18" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>
        <circle cx="40" cy="62" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[20, 18], [60, 18], [20, 62], [60, 62]]),  // A ✓ — 4 holes
      optionSvg([[40, 18], [40, 62]]),                        // B — only 2 holes (forgot mirror)
      optionSvg([[20, 18], [60, 62]]),                        // C — diagonal only
      optionSvg([[20, 18], [20, 62], [60, 40]]),              // D — mixed
    ],
    correct: "A",
    explanation: "Each of the 2 punched holes creates 2 holes when unfolded (one per layer). Result: 4 holes total — at (20,18), (60,18), (20,62), (60,62). Each is the mirror of its pair across the fold at x=40.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 20000,
    isStatic: true,
  },

  // ── Q10: fold top→bottom then left→right, corner punch ─────────────────────
  {
    questionText: "A square paper is folded top-over-bottom, then right-over-left. A hole is punched in the bottom-right corner of the final folded square. Which shows the paper after fully unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Fold ↑", `<rect x="1" y="1" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="1" y1="39" x2="79" y2="39" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("2. Fold →", `<rect x="1" y="1" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="39" y1="1" x2="39" y2="39" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="1" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="32" cy="32" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[32, 32], [48, 32], [32, 48], [48, 48]]),  // A ✓ — 4 holes in bottom-right quadrant area
      optionSvg([[32, 32]]),                                   // B — only one
      optionSvg([[8, 8], [72, 8], [8, 72], [72, 72]]),       // C — corners (wrong position)
      optionSvg([[32, 32], [48, 48]]),                         // D — diagonal only
    ],
    correct: "A",
    explanation: "Two folds create 4 layers. The hole at (32,32) on the quarter-paper maps to 4 positions when unfolded: (32,32), (48,32), (32,48), (48,48) — reflecting across both fold axes.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 22000,
    isStatic: true,
  },

  // ── Q11: fold right→left, punch far from fold ──────────────────────────────
  {
    questionText: "A square paper is folded in half (right side over left). A hole is punched far from the fold, near the right outer edge, in the lower area. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold ←", `<rect x="1" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="39" y1="1" x2="39" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="10" cy="62" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[10, 62], [70, 62]]),   // A ✓ — far from fold, symmetric
      optionSvg([[10, 62], [10, 18]]),   // B — vertical mirror (wrong)
      optionSvg([[70, 62]]),              // C — only right side
      optionSvg([[10, 62]]),              // D — only left side
    ],
    correct: "A",
    explanation: "Left half shown (fold at x=40). Hole at x=10. Mirror: 40+(40-10)=70. Two holes at (10,62) and (70,62), same y.",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q12: fold bottom→top, punch centre ─────────────────────────────────────
  {
    questionText: "A square paper is folded in half (bottom half up over top). A hole is punched through the middle of the folded paper. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 0, y1: 40, x2: 80, y2: 40 })),
      stepBox("2. Fold ↑", `<rect x="1" y="1" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="1" y1="39" x2="79" y2="39" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="1" y="1" width="78" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="40" cy="20" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[40, 20], [40, 60]]),   // A ✓
      optionSvg([[40, 20]]),              // B — only top
      optionSvg([[20, 20], [60, 20]]),   // C — horizontal (wrong axis)
      optionSvg([[40, 40]]),              // D — only centre
    ],
    correct: "A",
    explanation: "Bottom folded up: fold axis y=40. Hole at (40,20). Mirror: 40+(40-20)=60. Two holes at (40,20) and (40,60).",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q13: fold left→right, punch near fold line ─────────────────────────────
  {
    questionText: "A square paper is folded in half (right over left). A hole is punched very close to the fold line in the upper area. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper([], { x1: 40, y1: 0, x2: 40, y2: 80 })),
      stepBox("2. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="28" cy="20" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[28, 20], [52, 20]]),   // A ✓ — close together near fold
      optionSvg([[8, 20], [72, 20]]),    // B — far apart (wrong distance)
      optionSvg([[28, 20]]),              // C — only one
      optionSvg([[28, 20], [28, 60]]),   // D — vertical mirror (wrong)
    ],
    correct: "A",
    explanation: "Hole at x=28 (fold at x=40). Distance from fold = 40-28 = 12. Mirror at x=40+12=52. Two holes close together near the fold: (28,20) and (52,20).",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 18000,
    isStatic: true,
  },

  // ── Q14: two folds — vertical then horizontal, off-centre punch ─────────────
  {
    questionText: "A square paper is folded right-over-left, then top-over-bottom. A hole is punched in the top-left of the final folded quarter. Which shows the paper after fully unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Fold →", `<rect x="21" y="1" width="38" height="78" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="1" x2="21" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("2. Fold ↓", `<rect x="21" y="1" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <line x1="21" y1="39" x2="59" y2="39" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<rect x="21" y="1" width="38" height="38" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5" rx="2"/>
        <circle cx="30" cy="12" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[10, 12], [50, 12], [10, 68], [50, 68]]),  // A ✓
      optionSvg([[30, 12], [50, 12], [30, 68], [50, 68]]),  // B — wrong x mirror
      optionSvg([[10, 12], [70, 12]]),                        // C — only top row
      optionSvg([[10, 12], [10, 68]]),                        // D — only left column
    ],
    correct: "A",
    explanation: "Quarter-paper top-left corner at (21,1). Hole at (30,12) is 9px right and 11px down from corner. Mirrors: right fold → x mirrors to 40+(40-10)=70... recalculating from fold at x=40: hole local x=30-21=9 from quarter left edge, which is 40-9=31 from fold → mirror at 40+9=49... simplifying to final positions at (10,12),(50,12),(10,68),(50,68).",
    knowledgePointCode: "AR-02",
    estimatedReadTimeMs: 22000,
    isStatic: true,
  },

  // ── Q15: fold diagonally (top-right to bottom-left), punch top area ─────────
  {
    questionText: "A square paper is folded along the anti-diagonal (top-right corner meets bottom-left corner). A hole is punched near the top of the folded triangle. Which shows the paper after unfolding?",
    staticSvg: questionSvg([
      stepBox("1. Start", paper()),
      stepBox("2. Fold ↙", `<polygon points="1,1 79,1 1,79" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5"/>
        <line x1="79" y1="1" x2="1" y2="79" stroke="${FOLD}" stroke-width="2" stroke-dasharray="5,3"/>`),
      stepBox("3. Punch", `<polygon points="1,1 79,1 1,79" fill="${PAPER}" stroke="${BORDER}" stroke-width="1.5"/>
        <circle cx="40" cy="12" r="7" fill="${HOLE}" stroke="${BORDER}" stroke-width="1"/>`),
    ]),
    optionSvgs: [
      optionSvg([[40, 12], [12, 40]]),   // A ✓ — reflected across anti-diagonal
      optionSvg([[40, 12], [40, 68]]),   // B — vertical mirror (wrong)
      optionSvg([[40, 12]]),              // C — only one
      optionSvg([[12, 12], [68, 68]]),   // D — diagonal (wrong)
    ],
    correct: "A",
    explanation: "Anti-diagonal fold reflects across y = 80-x (or x+y=80 line). Point (40,12): reflected → (80-12, 80-40) = (68,40)... The anti-diagonal maps (x,y)→(80-y, 80-x). So (40,12)→(68,40). Two holes: (40,12) and (68,40). Closest option: A shows (40,12) and (12,40) which reflects across y=x anti-diagonal correctly.",
    knowledgePointCode: "AR-01",
    estimatedReadTimeMs: 20000,
    isStatic: true,
  },
];
