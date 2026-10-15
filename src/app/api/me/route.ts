import { auth } from "@clerk/nextjs/server";
import { authEnabled } from "@/lib/auth-config";
import { activePlan } from "@/lib/subscription";

/** The signed-in user's active subscription plan, or null. */
export async function GET() {
  if (!authEnabled) return Response.json({ plan: null, signedIn: false });
  const { userId } = await auth();
  if (!userId) return Response.json({ plan: null, signedIn: false });

  return Response.json({ plan: await activePlan(userId), signedIn: true });
}
