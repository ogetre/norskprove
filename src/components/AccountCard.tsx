"use client";

import { Show, SignOutButton, useClerk, useUser } from "@clerk/nextjs";

/**
 * Who is signed in, with the way out. The menu behind the avatar in the header has the same, but
 * a learner doesn't always see that the avatar is a menu. Signing out also clears this device's
 * copy of the progress (ProgressSync); it stays saved in the account.
 */
export function AccountCard() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <Show when="signed-in">
      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5 ring-1 ring-ice sm:p-6">
        <div className="min-w-0">
          <h2 className="font-semibold">Konto</h2>
          <p className="mt-1 truncate text-sm text-granite">{email ? `Logget inn som ${email}` : "Du er logget inn."}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => openUserProfile()}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice"
          >
            Administrer konto
          </button>
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-fjord"
            >
              Logg ut
            </button>
          </SignOutButton>
        </div>
      </section>
    </Show>
  );
}
