"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { useAccess } from "@/components/Access";
import type { PlanId } from "@/lib/plans";

function SignedInButton({ plan, cls }: { plan: PlanId; cls: string }) {
  const { plan: current, loading } = useAccess();
  if (loading) return <span className={`${cls} animate-pulse opacity-50`}>&nbsp;</span>;
  if (current === plan) {
    return (
      <Link href="/trening" className={cls}>
        Ditt abonnement. Gå til treningen
      </Link>
    );
  }
  // Checkout opens here once card payments are switched on.
  return (
    <button type="button" disabled className={`${cls} w-full cursor-not-allowed opacity-60`}>
      Betaling åpner snart
    </button>
  );
}

export function PlanButton({
  plan,
  name,
  highlighted,
  authEnabled,
}: {
  plan: PlanId;
  name: string;
  highlighted: boolean;
  authEnabled: boolean;
}) {
  const cls = `mt-8 block rounded-md px-5 py-3 text-center font-medium transition-colors ${
    highlighted ? "bg-rorbu text-white hover:bg-[#a03022]" : "bg-ink text-snow hover:bg-fjord"
  }`;

  const signUp = (
    <Link href={`/registrer?redirect_url=/priser%3Fplan%3D${plan}`} className={cls}>
      Velg {name}
    </Link>
  );

  if (!authEnabled) return signUp;

  return (
    <>
      <Show when="signed-out">{signUp}</Show>
      <Show when="signed-in">
        <SignedInButton plan={plan} cls={cls} />
      </Show>
    </>
  );
}
