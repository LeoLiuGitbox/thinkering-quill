import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

/**
 * Serve dynamically-generated writing images from disk.
 * Next.js production copies public/ at build time, so runtime-created images
 * aren't served from /writing-images/... — this route reads them directly.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Basic security: allow only UUID-named .png files
  if (!/^[a-f0-9-]{36}\.png$/i.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "writing-images", filename);

  try {
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return new NextResponse("Not found", { status: 404 });
    return new NextResponse("Internal error", { status: 500 });
  }
}
