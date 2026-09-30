import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Check,
  Clock,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import api from "../lib/api";

const SUBJECTS = [
  "An order I placed",
  "Returns or exchanges",
  "Product question",
  "Delivery and shipping",
  "Something else",
];

const EMPTY = { name: "", email: "", subject: SUBJECTS[0], message: "" };

const Contact = () => {
  const user = useSelector((state) => state.user.user);
  const [form, setForm] = useState({
    ...EMPTY,
    name: user?.name || "",
    email: user?.email || "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.message.trim().length < 10) {
      setError("Please write at least a sentence so we can help.");
      return;
    }

    setPending(true);
    try {
      const { data } = await api.post("/api/contact", form);
      if (!data.success) {
        throw new Error(data.message || "We could not send your message.");
      }
      setSent(true);
      setForm({ ...EMPTY, name: form.name, email: form.email });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "We could not send your message. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-[#f4f3ef] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-360">
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
            Astra / Contact
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-tight font-medium sm:text-5xl">
            We answer every message ourselves.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600">
            Questions about an order, a return, or whether something is right for
            you — tell us and a real person will reply, usually within one working
            day.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-360 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="text-2xl font-medium">Reach us directly</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Prefer email? Write to{" "}
              <a
                href="mailto:hello@astra.example"
                className="font-medium text-neutral-900 underline underline-offset-4 hover:text-amber-800"
              >
                hello@astra.example
              </a>
              . We read everything.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: Clock,
                  title: "One working day",
                  detail: "Monday to Friday, 9am to 5pm.",
                },
                {
                  icon: PackageCheck,
                  title: "Order help",
                  detail: "Have your order number ready and we can look it up.",
                },
                {
                  icon: Truck,
                  title: "Free shipping over $75",
                  detail: "Tracked delivery, and returns within 30 days.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure payments",
                  detail: "Card details are handled by Stripe, never by us.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <item.icon
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-800"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-950">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-600">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 border border-neutral-200 bg-[#faf9f6] p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-neutral-950">
                <MapPin size={15} aria-hidden="true" /> Studio
              </p>
              <p className="mt-1.5 text-sm leading-6 text-neutral-600">
                42 Foundry Lane
                <br />
                Unit 3, Manchester M1 5AB
                <br />
                United Kingdom
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                <Mail size={15} aria-hidden="true" />
                <a
                  href="mailto:hello@astra.example"
                  className="underline underline-offset-4 hover:text-amber-800"
                >
                  hello@astra.example
                </a>
              </p>
            </div>
          </div>

          <div className="border border-neutral-200 bg-[#faf9f6] p-6 sm:p-8">
            {sent ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check size={22} aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-medium text-neutral-950">
                  Message received.
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-neutral-600">
                  Thank you — we have your note and will reply to{" "}
                  <span className="font-medium text-neutral-900">
                    {form.email}
                  </span>{" "}
                  within one working day.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setForm({ ...EMPTY, name: form.name, email: form.email });
                    }}
                    className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-950"
                  >
                    <MessageSquare size={15} aria-hidden="true" />
                    Send another
                  </button>
                  <Link
                    to="/collection"
                    className="inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    Back to the collection{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-medium">Send us a message</h2>
                <p className="mt-1.5 text-sm text-neutral-600">
                  All fields are required.
                </p>
                <ContactForm
                  form={form}
                  error={error}
                  pending={pending}
                  onUpdate={update}
                  onSubmit={submit}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;

/** The form itself, kept separate so the panel above stays readable. */
function ContactForm({ form, error, pending, onUpdate, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-800">
          Your name
          <input
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={form.name}
            onChange={onUpdate}
            className="mt-1.5 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            value={form.email}
            onChange={onUpdate}
            className="mt-1.5 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-neutral-800">
        What is this about?
        <select
          name="subject"
          value={form.subject}
          onChange={onUpdate}
          className="mt-1.5 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
        >
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-neutral-800">
        Message
        <textarea
          name="message"
          required
          rows={6}
          maxLength={4000}
          placeholder="Include your order number if you have one."
          value={form.message}
          onChange={onUpdate}
          className="mt-1.5 w-full border border-neutral-300 bg-white p-3 text-sm leading-6 outline-none transition-colors focus:border-neutral-950"
        />
        <span className="mt-1 block text-xs text-neutral-500">
          {form.message.trim().length} / 4000
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Mail size={16} aria-hidden="true" />
        )}
        {pending ? "Sending" : "Send message"}
      </button>

      <p className="text-xs leading-5 text-neutral-500">
        We only use your email to reply to this message. No lists, no marketing.
      </p>
    </form>
  );
}
