"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to a new target over `duration` ms.
 * Respects the user's prefers-reduced-motion preference — when set, the value
 * updates immediately without animation.
 */
export function useAnimatedNumber(target: number, duration = 300): number {
  const [displayed, setDisplayed] = useState(target);

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(target);
  const displayedRef = useRef<number>(target);

  // Keep displayedRef in sync so the next animation starts from the current
  // mid-animation value (handles rapid value changes gracefully).
  displayedRef.current = displayed;

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      setDisplayed(target);
      return;
    }

    startValueRef.current = displayedRef.current;
    startTimeRef.current = performance.now();

    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic: fast start, gentle finish
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startValueRef.current + (target - startValueRef.current) * eased;

      if (t >= 1) {
        setDisplayed(target);
        animRef.current = null;
      } else {
        setDisplayed(current);
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [target, duration]);

  return displayed;
}
