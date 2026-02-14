type MailTransport = {
  sendMail: (payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<{ messageId?: string }>;
};

type MailerModule = {
  createTransport: (options: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user?: string; pass?: string };
    connectionTimeout: number;
    greetingTimeout: number;
    socketTimeout: number;
  }) => MailTransport;
};

const SMTP_HOST = process.env.SMTP_HOST ?? "localhost";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 1025);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM ?? "no-reply@internflow.local";

async function loadMailer(): Promise<MailerModule | null> {
  try {
    const moduleName = "nodemailer";
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
    const imported = (await dynamicImport(moduleName)) as { default?: MailerModule } & Partial<MailerModule>;
    return imported.default ?? (imported as unknown as MailerModule);
  } catch (error) {
    console.error("[mailer] nodemailer is unavailable in runtime", error);
    return null;
  }
}

export async function sendOtpEmail(email: string, code: string): Promise<{ delivered: boolean; fallbackLogged: boolean }> {
  const mailer = await loadMailer();
  if (!mailer) {
    console.info(`[DEV OTP] email=${email} code=${code}`);
    return { delivered: false, fallbackLogged: true };
  }

  const transporter = mailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000
  });

  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Your InternFlow one-time passcode",
      text: `Your InternFlow OTP code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your InternFlow OTP code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    });

    console.info(`[mailer] OTP email sent to ${email} messageId=${info.messageId ?? "n/a"}`);
    return { delivered: true, fallbackLogged: false };
  } catch (error) {
    console.error(`[mailer] Failed to send OTP email to ${email}`, error);
    console.info(`[DEV OTP] email=${email} code=${code}`);
    return { delivered: false, fallbackLogged: true };
  }
}
