import { NextResponse } from "next/server";
import { searchYouTube } from "@/lib/youtube";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q ausente" }, { status: 400 });
  const result = await searchYouTube(q);
  return NextResponse.json(result);
}
