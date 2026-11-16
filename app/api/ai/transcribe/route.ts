import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "AI transcription isn't configured." }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch {
    return NextResponse.json({ error: "Invalid audio upload." }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < 100 || audio.size > 8_000_000 ||
      !["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4;codecs=mp4a.40.2"].includes(audio.type)) {
    return NextResponse.json({ error: "Unsupported audio format or recording size (8 MB maximum)." }, { status: 400 });
  }
  const body = new FormData();
  body.set("file", audio, audio.name || "voice.webm");
  body.set("model", "whisper-1");
  body.set("prompt", "Food and ingredient names, Taglish, grams, rice, chicken, soy sauce.");
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body, signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return NextResponse.json({ error: "Transcription provider unavailable." }, { status: 502 });
    const data = await response.json() as { text?: string };
    return NextResponse.json({ text: (data.text ?? "").slice(0, 1000) });
  } catch {
    return NextResponse.json({ error: "Transcription failed. Please type the meal instead." }, { status: 502 });
  }
}
