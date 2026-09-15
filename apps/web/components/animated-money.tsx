"use client";

import { type Paise, formatPaise } from "@lms/domain";
import { useEffect, useRef, useState } from "react";

/**
 * Eases to a new figure over ~260ms instead of snapping. A total that jumps
 * while a slider moves reads as a glitch; one that travels reads as the number
 * responding to the handle.
 *
 * The displayed value is mirrored in a ref so the effect depends only on the
 * target — reading it from state would restart the animation every frame.
 */
export function AnimatedMoney({ paise, className = "" }: { paise: number; className?: string }) {
  const [shown, setShown] = useState(paise);
  const shownRef = useRef(paise);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = shownRef.current;
    if (from === paise) return;

    const settle = (value: number) => {
      shownRef.current = value;
      setShown(value);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle(paise);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 260);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic: quick, then gentle
      settle(Math.round(from + (paise - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [paise]);

  return <span className={`tabular-nums ${className}`}>{formatPaise(shown as Paise)}</span>;
}
