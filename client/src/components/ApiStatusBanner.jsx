import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { API_DOWN_EVENT, API_UP_EVENT } from "../lib/api";

/**
 * Connection banner.
 *
 * This is the only app-wide notification, and it is intentionally a banner
 * rather than a toast: it is part of the page flow, it never covers content, and
 * it stays until the problem is actually fixed. A toast that vanishes on a timer
 * would be useless here, because the API being down does not resolve itself.
 */
const ApiStatusBanner = () => {
  // Seeded from the browser's own signal so the first paint is already correct
  // — no setState needed on mount.
  const [down, setDown] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine === false : false,
  );

  useEffect(() => {
    const goDown = () => setDown(true);
    const goUp = () => setDown(false);

    window.addEventListener(API_DOWN_EVENT, goDown);
    window.addEventListener(API_UP_EVENT, goUp);
    // The browser's own connectivity signal, independent of the API.
    window.addEventListener("offline", goDown);
    window.addEventListener("online", goUp);

    return () => {
      window.removeEventListener(API_DOWN_EVENT, goDown);
      window.removeEventListener(API_UP_EVENT, goUp);
      window.removeEventListener("offline", goDown);
      window.removeEventListener("online", goUp);
    };
  }, []);

  if (!down) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-50"
    >
      <div className="mx-auto flex max-w-360 items-start gap-3 px-5 py-3 sm:px-8 lg:px-12">
        <WifiOff
          size={16}
          className="mt-0.5 shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <p className="text-sm leading-6 text-amber-950">
          <span className="font-semibold">We cannot reach the store right now.</span>{" "}
          Browsing still works, but adding to cart, wishlist and checkout need the
          server. It usually means the API is not running — start it with{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
            npm run dev
          </code>
          .
        </p>
        <AlertTriangle
          size={16}
          className="mt-0.5 hidden shrink-0 text-amber-800 sm:block"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default ApiStatusBanner;
