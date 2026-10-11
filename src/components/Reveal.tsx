"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

type Tag = "div" | "section" | "ol" | "ul" | "figure" | "dl";

/**
 * Marks its subtree as visible the first time it scrolls into view.
 * Children opt into an entrance with the r-* classes in globals.css and
 * stagger with the --i custom property.
 */
export function Reveal({
  as: Component = "div",
  ...rest
}: { as?: Tag } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Component ref={ref as never} data-reveal="" {...rest} />;
}
