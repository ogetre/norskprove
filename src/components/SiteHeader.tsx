"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Sticky header that gains a frosted background once the page is scrolled. */
export function SiteHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (window.scrollY > 8) el.dataset.scrolled = "";
      else delete el.dataset.scrolled;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={ref}
      className="group/header sticky top-0 z-30 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-scrolled:border-ice data-scrolled:bg-snow/85 data-scrolled:backdrop-blur-md"
    >
      {children}
    </header>
  );
}
