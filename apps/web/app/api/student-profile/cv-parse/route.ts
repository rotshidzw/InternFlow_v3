import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { extractCandidateProfileFromCv } from "@/lib/openrouter-ai";

const COMMON_SKILLS = [
  "communication",
  "teamwork",
  "leadership",
  "microsoft excel",
  "microsoft word",
  "customer service",
  "javascript",
  "typescript",
  "react",
  "node",
  "problem solving",
  "time management",
  "data entry",
];

function normalize(input: string) {
  return input.replace(/\r/g, "").trim();
}

function extractFieldsFallback(text: string) {
  const clean = normalize(text);
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email =
    clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone =
    clean.match(
      /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)\d{3}[\s-]?\d{4}/,
    )?.[0] ?? null;

  const matchedSkills = COMMON_SKILLS.filter((skill) =>
    clean.toLowerCase().includes(skill),
  ).map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase()));

  const possibleName =
    lines.find(
      (line) =>
        /^[A-Za-z\s.'-]{5,}$/.test(line) &&
        !line.toLowerCase().includes("curriculum vitae"),
    ) ?? null;

  return {
    fullName: possibleName,
    email,
    phone,
    location: null,
    education: [],
    experience: [],
    skills: matchedSkills,
    certifications: [],
    summary: lines.slice(0, 6).join(" ").slice(0, 320) || null,
  };
}

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let cvText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("cvFile");
    if (file instanceof File) {
      const bytes = Buffer.from(await file.arrayBuffer());
      cvText = bytes.toString("utf8");
    }
  } else {
    const payload = (await req.json()) as { cvText?: string };
    cvText = payload.cvText ?? "";
  }

  if (!cvText.trim()) {
    return NextResponse.json(
      { ok: false, error: "CV text is empty" },
      { status: 400 },
    );
  }

  const aiResult = await extractCandidateProfileFromCv(cvText);
  const fields = aiResult.ok ? aiResult.fields : extractFieldsFallback(cvText);

  return NextResponse.json({
    ok: true,
    fields,
    aiUsed: aiResult.ok,
    note: aiResult.ok
      ? "AI-assisted CV extraction completed. Please review and edit fields before saving."
      : "Fallback CV extraction completed. AI extraction is unavailable right now.",
  });
}
