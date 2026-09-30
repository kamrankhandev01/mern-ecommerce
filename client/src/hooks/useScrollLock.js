import { useEffect } from "react";

/**
 * Locks page scrolling while a dialog or overlay is open.
 *
 * Without this the page scrolls behind a full-screen modal on touch devices
 * and desktop, and the body keeps its scroll position when the modal closes.
 * Several dialogs may be open at once, so the lock is reference counted rather
 * than toggled.
 */
let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

const lock = () => {
  lockCount += 1;
  if (lockCount > 1) return;
  const { body, documentElement } = document;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  // Compensate for the scrollbar so the layout does not jump sideways.
  const scrollbar = window.innerWidth - documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (scrollbar > 0) {
    const current = Number.parseFloat(
      window.getComputedStyle(body).paddingRight,
    );
    body.style.paddingRight = `${(current || 0) + scrollbar}px`;
  }
};

const unlock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
};

export const useScrollLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    lock();
    return unlock;
  }, [active]);
};

export default useScrollLock;
