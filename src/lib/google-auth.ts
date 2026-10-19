/*
 * An OAuth access token for a Google Cloud service account, for APIs that don't take an API key:
 * Gemini on Vertex AI for the oral test on the server, and the audio and picture scripts. The key
 * comes from GOOGLE_SA_JSON (the JSON key itself) or GOOGLE_APPLICATION_CREDENTIALS (a path to
 * it). It is never written anywhere. Not marked server-only, since the scripts run it in Node.
 */

import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

type ServiceAccount = { client_email: string; private_key: string; project_id?: string };

async function serviceAccount(): Promise<ServiceAccount | null> {
  const inline = process.env.GOOGLE_SA_JSON;
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = inline?.trim() ? inline : file ? await readFile(file, "utf8") : null;
  if (!raw) return null;
  const sa = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!sa.client_email || !sa.private_key) throw new Error("The service account JSON has no client_email or private_key.");
  return { client_email: sa.client_email, private_key: sa.private_key, project_id: sa.project_id };
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** A signed JWT asking Google for a token with the cloud-platform scope. */
export function signedAssertion(sa: ServiceAccount, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
}

/** The service account's project, where Vertex AI requests are billed. */
export async function projectId(): Promise<string | null> {
  return (await serviceAccount())?.project_id ?? null;
}

let cached: { token: string; expires: number } | null = null;

/** A token valid for at least five more minutes, or null when no service account is set up. */
export async function accessToken(): Promise<string | null> {
  if (cached && cached.expires - Date.now() > 5 * 60_000) return cached.token;
  const sa = await serviceAccount();
  if (!sa) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedAssertion(sa),
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!data.access_token) throw new Error(`Google refused the service account: ${data.error_description ?? res.status}`);
  cached = { token: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}
