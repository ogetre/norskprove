/** Sign-in works only once Clerk keys are configured (vercel env pull). */
export const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
