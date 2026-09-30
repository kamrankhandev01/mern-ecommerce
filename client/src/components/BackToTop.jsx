import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Back to top.
 *
 * Only appears once the visitor has actually scrolled, and respects reduced
 * motion. It is deliberately not a floating pill in the corner of every page —
 * it sits at the end of the footer so it never covers content.
 */
const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        })
      }
      className="mt-10 inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-950 hover:text-neutral-950"
    >
      <ArrowUp size={15} aria-hidden="true" />
      Back to top
    </button>
  );
};

export default BackToTop;
