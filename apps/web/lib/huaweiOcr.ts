import crypto from "node:crypto";

export type HuaweiOcrResult = {
  status: "SUCCESS" | "FAILED";
  text: string;
  json: unknown;
  error?: string;
};

function ocrEnabledForType(docType: string) {
  if (process.env.ENABLE_OCR !== "true") return false;
  const allow = (process.env.OCR_ENABLED_DOC_TYPES ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return allow.length === 0 || allow.includes(docType.toUpperCase());
}

function resolveHuaweiToken() {
  const ak = process.env.HUAWEI_ACCESS_KEY ?? "";
  const sk = process.env.HUAWEI_SECRET_KEY ?? "";
  if (!ak || !sk) return null;

  // Competition-safe lightweight token derivation placeholder.
  // Replace with Huawei IAM token exchange in production hardening.
  return crypto.createHash("sha256").update(`${ak}:${sk}`).digest("hex");
}

export async function runHuaweiGeneralTextOcr(input: { base64: string; docType: string }): Promise<HuaweiOcrResult> {
  if (!ocrEnabledForType(input.docType)) {
    return { status: "FAILED", text: "", json: {}, error: "OCR disabled for this document type" };
  }

  const endpointTemplate = process.env.HUAWEI_OCR_ENDPOINT;
  const projectId = process.env.HUAWEI_PROJECT_ID;
  if (!endpointTemplate || !projectId) {
    return { status: "FAILED", text: "", json: {}, error: "Huawei OCR endpoint/project not configured" };
  }

  const endpoint = endpointTemplate.replace("{project_id}", projectId);
  const token = resolveHuaweiToken();
  if (!token) {
    return { status: "FAILED", text: "", json: {}, error: "Huawei AK/SK missing" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token
      },
      body: JSON.stringify({ image: input.base64 })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: "FAILED",
        text: "",
        json: payload,
        error: `OCR HTTP ${res.status}`
      };
    }

    const blocks = (payload?.result?.texts ?? payload?.result?.words_block_list ?? []) as Array<{ words?: string; text?: string }>;
    const text = blocks.map((item) => item.words ?? item.text ?? "").filter(Boolean).join("\n");

    return { status: "SUCCESS", text, json: payload };
  } catch (error) {
    return {
      status: "FAILED",
      text: "",
      json: {},
      error: error instanceof Error ? error.message : "Unknown OCR error"
    };
  }
}
