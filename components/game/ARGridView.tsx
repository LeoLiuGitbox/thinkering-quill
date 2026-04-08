"use client";

interface ARCell {
  shape: "triangle" | "circle" | "square" | "pentagon" | "star" | "arrow" | "cross" | "empty";
  rotation: 0 | 90 | 180 | 270;
  fill: "solid" | "outline" | "striped";
  size: "small" | "large";
  count?: number;
}

interface ARGridViewProps {
  gridData: ARCell[][];
  type: "sequence" | "pattern" | "odd_one_out" | "single";
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

function ARCellSVG({ cell, cellSize }: { cell: ARCell; cellSize: number }) {
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const baseR = cellSize * (cell.size === "large" ? 0.36 : 0.22);

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

  const path = getShapePath(cell.shape, cx, cy, baseR);

  let fillColor = "#EADFC8";
  let strokeColor = "#EADFC8";
  let patternId = `stripes-${Math.random().toString(36).slice(2)}`;

  if (cell.fill === "solid") {
    fillColor = "#EADFC8";
  } else if (cell.fill === "outline") {
    fillColor = "none";
  } else if (cell.fill === "striped") {
    fillColor = `url(#${patternId})`;
  }

  return (
    <svg
      width={cellSize}
      height={cellSize}
      viewBox={`0 0 ${cellSize} ${cellSize}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        {cell.fill === "striped" && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
            <line x1="0" y1="0" x2="4" y2="4" stroke="#EADFC8" strokeWidth="1.5" />
          </pattern>
        )}
      </defs>
      <g transform={`rotate(${cell.rotation}, ${cx}, ${cy})`}>
        <path d={path} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function ARGridView({ gridData, type, size = "normal" }: ARGridViewProps) {
  const cellSize = size === "small" ? 48 : 72;
  const gap = size === "small" ? 3 : 5;

  if (!gridData || gridData.length === 0) return null;

  if (type === "sequence" || type === "single") {
    // Horizontal sequence row
    const row = gridData.flat();
    return (
      <div
        className="flex items-center justify-center gap-1 p-3 rounded-xl"
        style={{ background: "#0F1C3F", border: "1px solid #B68A3A33" }}
      >
        {row.map((cell, i) => (
          <div
            key={i}
            className="rounded-lg flex items-center justify-center"
            style={{
              width: cellSize,
              height: cellSize,
              background: "#1E2E5A",
              border: "1px solid #B68A3A44",
            }}
          >
            <ARCellSVG cell={cell} cellSize={cellSize - 8} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "pattern") {
    // 3×3 grid
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
            <div
              key={i}
              className="rounded-lg flex items-center justify-center"
              style={{
                width: cellSize,
                height: cellSize,
                background: "#1E2E5A",
                border: "1px solid #B68A3A44",
              }}
            >
              <ARCellSVG cell={cell} cellSize={cellSize - 8} />
            </div>
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
          <div
            key={i}
            className="rounded-lg flex items-center justify-center"
            style={{
              width: cellSize,
              height: cellSize,
              background: "#1E2E5A",
              border: "1px solid #B68A3A44",
            }}
          >
            <ARCellSVG cell={cell} cellSize={cellSize - 8} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
