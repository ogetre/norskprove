"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { useEffect } from "react";

/*
 * Page views without cookies, to see how much the free beta is used. The owner's own visits would
 * muddle the numbers, so a browser that has opened the statistics page is left out from then on,
 * and so is the statistics page itself.
 */

const OWNER_KEY = "norskproveklar:owner";

function owner(): boolean {
  try {
    return localStorage.getItem(OWNER_KEY) === "1";
  } catch {
    return false;
  }
}

function skipOwn(event: BeforeSendEvent): BeforeSendEvent | null {
  if (owner() || new URL(event.url, location.origin).pathname.startsWith("/admin")) return null;
  return event;
}

export function SiteAnalytics() {
  return <Analytics beforeSend={skipOwn} />;
}

/** Marks this browser as the owner's, so its visits are no longer counted. */
export function MarkOwner() {
  useEffect(() => {
    try {
      localStorage.setItem(OWNER_KEY, "1");
    } catch {
      // Private mode: the visits are counted, as before.
    }
  }, []);
  return null;
}
