import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { authEnabled } from "./auth-config";

const isDev = process.env.NODE_ENV === "development";

/** Who may see the owner's statistics: verified e-mail addresses in ADMIN_EMAILS, comma-separated. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type AdminAccess = "admin" | "signed-out" | "denied";

/** Whether the visitor is the site's owner. Locally without sign-in, anyone is. */
export async function adminAccess(): Promise<AdminAccess> {
  if (!authEnabled) {
    await connection();
    return isDev ? "admin" : "denied";
  }
  const { userId } = await auth();
  if (!userId) return "signed-out";
  const allowed = adminEmails();
  const user = await currentUser();
  const owner = user?.emailAddresses.some(
    (e) => e.verification?.status === "verified" && allowed.includes(e.emailAddress.toLowerCase()),
  );
  return owner ? "admin" : "denied";
}
