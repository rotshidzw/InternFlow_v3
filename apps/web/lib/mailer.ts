import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "localhost";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 1025);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM ?? "no-reply@internflow.local";
const ENABLE_CONSOLE_OTP = process.env.ENABLE_CONSOLE_OTP === "true";

let dependencyWarningShown = false;


function isExpectedSmtpConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ECONNABORTED") ||
    error.message.includes("EPIPE") ||
    error.message.includes("Unexpected socket close")
  );
}

function getTransporter() {
  try {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000
    });
  } catch (error) {
    if (!dependencyWarningShown) {
      dependencyWarningShown = true;
      console.error("[mailer] nodemailer transport initialization failed. Run `npm install` to ensure dependencies are installed.", error);
    }
    return null;
  }
}

export async function sendOtpEmail(email: string, code: string): Promise<{ delivered: boolean; fallbackLogged: boolean }> {
  const transporter = getTransporter();
  if (!transporter) {
    if (ENABLE_CONSOLE_OTP) console.info(`[CONSOLE OTP] email=${email} code=${code}`);
    return { delivered: false, fallbackLogged: ENABLE_CONSOLE_OTP };
  }

  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Your InternFlow one-time passcode",
      text: `Your InternFlow OTP code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your InternFlow OTP code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    });

    console.info(`[mailer] OTP email sent to ${email} messageId=${info.messageId}`);
    return { delivered: true, fallbackLogged: false };
  } catch (error) {
    if (isExpectedSmtpConnectionError(error)) {
      console.warn(`[mailer] SMTP connection issue while sending OTP to ${email}: ${(error as Error).message}`);
    } else {
      console.error(`[mailer] Failed to send OTP email to ${email}`, error);
    }
    if (ENABLE_CONSOLE_OTP) console.info(`[CONSOLE OTP] email=${email} code=${code}`);
    return { delivered: false, fallbackLogged: ENABLE_CONSOLE_OTP };
  }
}

export async function sendPlatformEmail(to: string, subject: string, message: string): Promise<{ delivered: boolean }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.info(`[DEV MAIL] to=${to} subject=${subject} message=${message}`);
    return { delivered: false };
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    return { delivered: true };
  } catch (error) {
    if (isExpectedSmtpConnectionError(error)) {
      console.warn(`[mailer] SMTP connection issue while sending platform email to ${to}: ${(error as Error).message}`);
    } else {
      console.error(`[mailer] Failed platform email to ${to}`, error);
    }
    console.info(`[DEV MAIL] to=${to} subject=${subject} message=${message}`);
    return { delivered: false };
  }
}


export async function sendPlatformEmailMany(to: string[], subject: string, message: string): Promise<{ delivered: boolean }> {
  const recipients = [...new Set(to.filter(Boolean))];
  if (recipients.length === 0) return { delivered: false };

  const transporter = getTransporter();
  if (!transporter) {
    console.info(`[DEV MAIL] to=${recipients.join(",")} subject=${subject} message=${message}`);
    return { delivered: false };
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: recipients.join(","),
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    return { delivered: true };
  } catch (error) {
    if (isExpectedSmtpConnectionError(error)) {
      console.warn(`[mailer] SMTP connection issue while sending bulk platform email: ${(error as Error).message}`);
    } else {
      console.error(`[mailer] Failed bulk platform email to ${recipients.join(",")}`, error);
    }
    console.info(`[DEV MAIL] to=${recipients.join(",")} subject=${subject} message=${message}`);
    return { delivered: false };
  }
}
