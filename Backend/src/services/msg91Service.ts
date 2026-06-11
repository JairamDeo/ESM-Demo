const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow/";

export const OTP_EXPIRY_SECONDS = 120;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

function normalizeIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function isOtpSmsEnabled(): boolean {
  return process.env.OTP_ENABLE === "true";
}

export function isOtpBypassEnabled(): boolean {
  return process.env.OTP_BYPASS === "true";
}

/**
 * Send login OTP via MSG91 Flow API.
 * Template variable name must match your MSG91 flow (default env: MSG91_OTP_VAR=OTP).
 */
export async function sendLoginOtpSms(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const flowId = process.env.MSG91_FLOW_OTP_LOGIN?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim();
  const otpVar = (process.env.MSG91_OTP_VAR || "OTP").trim();

  if (!authKey || !flowId) {
    throw new Error("MSG91 is not configured (MSG91_AUTH_KEY / MSG91_FLOW_OTP_LOGIN)");
  }

  const mobiles = normalizeIndianMobile(phone);
  const recipient: Record<string, string> = { mobiles, [otpVar]: otp };

  const payload: Record<string, unknown> = {
    flow_id: flowId,
    recipients: [recipient],
  };
  if (senderId) payload.sender = senderId;

  const response = await fetch(MSG91_FLOW_URL, {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  let body: any = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || `MSG91 request failed (${response.status})`);
  }

  const type = String(body?.type || "").toLowerCase();
  if (type && type !== "success" && body?.message && !body?.request_id) {
    throw new Error(body.message);
  }
}
