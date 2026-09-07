import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cal.com signs the raw webhook body with HMAC-SHA256 using the secret
// configured on the webhook, sent in the `X-Cal-Signature-256` header.
// Must be verified against the raw request bytes, before any JSON parsing.
export function verifyCalComSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.CAL_COM_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
