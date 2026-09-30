import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Check, LoaderCircle, Mail, Send } from "lucide-react";
import api from "../lib/api";
import BackToTop from "./BackToTop";

// Computed once at module scope: the footer does not need a fresh Date() on
// every render.
const YEAR = new Date().getFullYear();

/**
 * Site footer. It also hosts the newsletter form, which posts to the same
 * contact endpoint — no extra service and no third-party embed.
 */
const Footer = () => {
  const user = useSelector((state) => state.user.user);
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const subscribe = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setStatus("pending");
    try {
      await api.post("/api/contact", {
        name: user?.name || "Astra subscriber",
        email,
        subject: "Newsletter signup",
        message: `Please add ${email} to the Astra mailing list.`,
      });
      setStatus("done");
      setMessage("Thanks — you are on the list.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          "We could not sign you up just now. Please try again.",
      );
    }
  };

  const columns = [
    {
      title: "Shop",
      links: [
        { to: "/collection", label: "The collection" },
        { to: "/collection?sort=newest", label: "New arrivals" },
        { to: "/collection?sort=featured", label: "Best sellers" },
        { to: "/about", label: "About Astra" },
      ],
    },
    {
      title: "Help",
      links: [
        { to: "/account", label: "Your account" },
        { to: "/orders", label: "Order history" },
        { to: "/wishlist", label: "Wishlist" },
        { to: "/contact", label: "Contact us" },
        { to: "/contact", label: "Returns" },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-[#f4f3ef] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-360">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr]">
          <div>
            <Link
              to="/"
              className="text-2xl font-semibold tracking-[-0.04em] text-neutral-950"
            >
              astra<span className="text-amber-600">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">
              A small shop for things worth keeping. Free tracked shipping over $75
              and 30-day returns.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-neutral-700 transition-colors hover:text-amber-800"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
              Stay in touch
            </h2>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              One short email a month when something new arrives. No noise.
            </p>
            {status === "done" ? (
              <p className="mt-4 inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <Check size={15} aria-hidden="true" />
                {message}
              </p>
            ) : (
              <form onSubmit={subscribe} className="mt-4" noValidate>
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="footer-email">
                    Email address
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    required
                    maxLength={200}
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    className="h-11 min-w-0 flex-1 border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
                  />
                  <button
                    type="submit"
                    disabled={status === "pending"}
                    aria-label="Join the mailing list"
                    className="inline-flex size-11 shrink-0 items-center justify-center bg-neutral-950 text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
                  >
                    {status === "pending" ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {message && status === "error" && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {message}
                  </p>
                )}
              </form>
            )}
            <a
              href="mailto:hello@astra.example"
              className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-700 underline underline-offset-4 transition-colors hover:text-amber-800"
            >
              <Mail size={14} aria-hidden="true" />
              hello@astra.example
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-neutral-500">
            © {YEAR} Astra. A demonstration storefront.
          </p>
          <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-500">
            <Link to="/about" className="hover:text-amber-800">
              About
            </Link>
            <Link to="/contact" className="hover:text-amber-800">
              Contact
            </Link>
            <span>Visa · Mastercard · Safepay</span>
          </div>
        </div>

        <BackToTop />
      </div>
    </footer>
  );
};

export default Footer;
