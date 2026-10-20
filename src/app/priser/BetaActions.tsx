"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";

const primary = "rounded-md bg-rorbu px-6 py-3 font-medium text-white transition-colors hover:bg-[#a03022]";
const secondary = "rounded-md px-6 py-3 font-medium text-ink ring-1 ring-ice transition-colors hover:bg-ice";

function Actions({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {signedIn ? (
        <Link href="/trening" className={primary}>
          Gå til treningen
        </Link>
      ) : (
        <>
          <Link href="/registrer?redirect_url=/trening" className={primary}>
            Lag gratis konto
          </Link>
          <Link href="/trening" className={secondary}>
            Øv uten konto
          </Link>
        </>
      )}
    </div>
  );
}

/** The next step during the free beta: an account, or straight to practice. */
export function BetaActions({ authEnabled }: { authEnabled: boolean }) {
  if (!authEnabled) return <Actions signedIn={false} />;
  return (
    <>
      <Show when="signed-in">
        <Actions signedIn />
      </Show>
      <Show when="signed-out">
        <Actions signedIn={false} />
      </Show>
    </>
  );
}
