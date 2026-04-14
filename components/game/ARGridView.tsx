"use client";

interface ARCell {
  shape: "triangle" | "circle" | "square" | "pentagon" | "star" | "arrow" | "cross" | "empty";
  rotation: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  fill: "solid" | "outline" | "striped";
  size: "small" | "large";
  count?: number;
  position?: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "C";
}

interface ARGridViewProps {
  gridData: ARCell[][];
  type: "sequence" | "pattern" | "odd_one_out" | "single" | "analogy";
  size?: "normal" | "small";
}

function getShapePath(shape: string, cx: number, cy: number, r: number): string {
  switch (shape) {
    case "circle":
      return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
    case "square":
      return `M ${cx - r} ${cy - r} H ${cx + r} V ${cy + r} H ${cx - r} Z`;
    case "triangle":
      return `M ${cx} ${cy - r} L ${cx + r} ${cy + r} L ${cx - r} ${cy + r} Z`;
    case "pentagon": {
      const pts = Array.from({ length: 5 }).map((_, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      });
      return `M ${pts.join(" L ")} Z`;
    }
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * 36 - 90) * (Math.PI / 180);
        const rad = i % 2 === 0 ? r : r * 0.4;
        pts.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
      }
      return `M ${pts.join(" L ")} Z`;
    }
    case "arrow":
      return `M ${cx} ${cy - r} L ${cx + r * 0.5} ${cy} L ${cx + r * 0.2} ${cy} L ${cx + r * 0.2} ${cy + r} L ${cx - r * 0.2} ${cy + r} L ${cx - r * 0.2} ${cy} L ${cx - r * 0.5} ${cy} Z`;
    case "cross":
      return `M ${cx - r * 0.25} ${cy - r} H ${cx + r * 0.25} V ${cy - r * 0.25} H ${cx + r} V ${cy + r * 0.25} H ${cx + r * 0.25} V ${cy + r} H ${cx - r * 0.25} V ${cy + r * 0.25} H ${cx - r} V ${cy - r * 0.25} H ${cx - r * 0.25} Z`;
    default:
      return "";
  }
}

// Maps compass position to (dx, dy) offset from cell centre.
// Rotation pivot remains at (cx, cy) so a shape at NE rotating 90° moves to SE.
function getCompassOffset(position: string | undefined, cellSize: number): { dx: number; dy: number } {
  const step = cellSize * 0.28;
  const offsets: Record<string, [number, number]> = {
    N:  [0,      -step],
    NE: [step,   -step],
    E:  [step,    0   ],
    SE: [step,    step],
    S:  [0,       step],
    SW: [-step,   step],
    W:  [-step,   0   ],
    NW: [-step,  -step],
    C:  [0,       0   ],
  };
  const [dx, dy] = offsets[position ?? "C"] ?? [0, 0];
  return { dx, dy };
}

function ARCellSVG({ cell, cellSize, cellIndex }: { cell: ARCell; cellSize: number; cellIndex: number }) {
  const cx = cellSize / 2;
  const cy = cellSize / 2;

  // Clip ID scoped to this cell to prevent overflow bleeding into neighbours
  const clipId = `cell-clip-${cellIndex}`;
  // Deterministic stripe pattern ID — avoids React re-render churn from Math.random()
  const patternId = `stripes-${cellIndex}-${cell.fill}`;
  const stripeSize = cellSize < 56 ? 3 : 4;
  const strokeWidth = cellSize < 56 ? 2.5 : 1.5;

  if (cell.shape === "empty") {
    return (
      <svg width={cellSize} height={cellSize} viewBox={`0 0 ${cellSize} ${cellSize}`}>
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={cellSize * 0.5}
          fill="#B68A3A"
          fontWeight="bold"
        >
          ?
        </text>
      </svg>
    );
  }

  // Compass position offset — shape centre shifts but rotation pivots at cell centre
  const { dx, dy } = getCompassOffset(cell.position, cellSize);
  const shapeCx = cx + dx;
  const shapeCy = cy + dy;

  // Count > 1: render multiple shapes; scale down so they fit
  const count = cell.count && cell.count > 1 ? cell.count : 1;
  const baseR = cellSize * (cell.size === "large" ? 0.36 : 0.22) * (count > 1 ? 0.65 : 1);
  const spacing = baseR * 0.8;
  const vOffset = baseR * 0.6;

  // Compute per-shape centres for multi-count
  let shapeCentres: Array<[number, number]>;
  if (count === 3) {
    shapeCentres = [
      [shapeCx - spacing, shapeCy + vOffset],
      [shapeCx + spacing, shapeCy + vOffset],
      [shapeCx,           shapeCy - vOffset],
    ];
  } else if (count === 2) {
    shapeCentres = [
      [shapeCx - spacing, shapeCy],
      [shapeCx + spacing, shapeCy],
    ];
  } else {
    shapeCentres = [[shapeCx, shapeCy]];
  }

  let fillColor = "#EADFC8";
  const strokeColor = "#EADFC8";

  if (cell.fill === "outline") {
    fillColor = "none";
  } else if (cell.fill === "striped") {
    fillColor = `url(#${patternId})`;
  }

  return (
    <svg
      width={cellSize}
      height={cellSize}
      viewBox={`0 0 ${cellSize} ${cellSize}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={cellSize} height={cellSize} />
        </clipPath>
        {cell.fill === "striped" && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width={stripeSize} height={stripeSize}>
            <line x1="0" y1="0" x2={stripeSize} y2={stripeSize} stroke="#EADFC8" strokeWidth="1.5" />
          </pattern>
        )}
      </defs>
      {/* Each shape rotates individually around the cell centre */}
      <g clipPath={`url(#${clipId})`}>
        {shapeCentres.map(([scx, scy], idx) => {
          const path = getShapePath(cell.shape, scx, scy, baseR);
          return (
            <g key={idx} transform={`rotate(${cell.rotation}, ${cx}, ${cy})`}>
              <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// Shared cell box wrapper
function CellBox({ cell, cellSize, cellIndex }: { cell: ARCell; cellSize: number; cellIndex: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{
        width: cellSize,
        height: cellSize,
        background: "#1E2E5A",
        border: "1px solid #B68A3A44",
      }}
    >
      <ARCellSVG cell={cell} cellSize={cellSize - 8} cellIndex={cellIndex} />
    </div>
  );
}

export default function ARGridView({ gridData, type, size = "normal" }: ARGridViewProps) {
  const cellSize = size === "small" ? 48 : 72;
  const gap = size === "small" ? 3 : 5;

  if (!gridData || gridData.length === 0) return null;

  if (type === "sequence" || type === "single") {
    const row = gridData.flat();
    return (
      <div
        className="flex items-center justify-center gap-1 p-3 rounded-xl"
        style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
      >
        {row.map((cell, i) => (
          <CellBox key={i} cell={cell} cellSize={cellSize} cellIndex={i} />
        ))}
      </div>
    );
  }

  if (type === "pattern") {
    return (
      <div
        className="p-3 rounded-xl inline-block"
        style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridData[0]?.length || 3}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          {gridData.flat().map((cell, i) => (
            <CellBox key={i} cell={cell} cellSize={cellSize} cellIndex={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "odd_one_out") {
    const row = gridData.flat();
    return (
      <div
        className="flex items-center justify-center gap-2 p-3 rounded-xl"
        style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
      >
        {row.map((cell, i) => (
          <CellBox key={i} cell={cell} cellSize={cellSize} cellIndex={i} />
        ))}
      </div>
    );
  }

  if (type === "analogy") {
    // 2×2 layout: A : B / ─────── / C : ?
    // Larger cells since there are only 4 total — more room to see the transformation
    const analogyCellSize = size === "small" ? 64 : 96;
    const row0 = gridData[0] ?? [];
    const row1 = gridData[1] ?? [];

    return (
      <div
        className="p-4 rounded-xl inline-block"
        style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
      >
        {/* Row 0: A : B */}
        <div className="flex items-center justify-center gap-2">
          <CellBox cell={row0[0]} cellSize={analogyCellSize} cellIndex={0} />
          <span style={{ color: "#B68A3A", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>:</span>
          <CellBox cell={row0[1]} cellSize={analogyCellSize} cellIndex={1} />
        </div>
        {/* Horizontal divider */}
        <div style={{ height: 1, background: "#B68A3A44", margin: "8px 0" }} />
        {/* Row 1: C : ? */}
        <div className="flex items-center justify-center gap-2">
          <CellBox cell={row1[0]} cellSize={analogyCellSize} cellIndex={2} />
          <span style={{ color: "#B68A3A", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>:</span>
          <CellBox cell={row1[1]} cellSize={analogyCellSize} cellIndex={3} />
        </div>
      </div>
    );
  }

  return null;
}
