const OTP_TTL_MS = 10 * 60 * 1000;

type OtpRecord = {
  code: string;
  email: string;
  expiresAt: number;
};

declare global {
  var __internflowOtpStore: Map<string, OtpRecord> | undefined;
}

function getStore() {
  if (!globalThis.__internflowOtpStore) {
    globalThis.__internflowOtpStore = new Map<string, OtpRecord>();
  }

  return globalThis.__internflowOtpStore;
}

export function saveOtp(email: string, code: string) {
  const store = getStore();
  store.set(email.toLowerCase(), {
    code,
    email: email.toLowerCase(),
    expiresAt: Date.now() + OTP_TTL_MS
  });
}

export function verifyOtp(email: string, code: string) {
  const store = getStore();
  const key = email.toLowerCase();
  const record = store.get(key);

  if (!record) return { ok: false as const, reason: "not_found" };
  if (Date.now() > record.expiresAt) {
    store.delete(key);
    return { ok: false as const, reason: "expired" };
  }

  if (record.code !== code.trim()) {
    return { ok: false as const, reason: "invalid" };
  }

  store.delete(key);
  return { ok: true as const };
}
