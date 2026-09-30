import { Link } from "react-router-dom";
import {
  ArrowRight,
  Leaf,
  PackageCheck,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const VALUES = [
  {
    icon: Ruler,
    title: "Fewer, better things",
    detail:
      "We would rather sell one object that lasts a decade than ten that do not. Every piece earns its place on the site.",
  },
  {
    icon: Leaf,
    title: "Honest materials",
    detail:
      "We describe what something is actually made from, where it came from, and how to care for it. No vague words.",
  },
  {
    icon: RefreshCw,
    title: "Built to be kept",
    detail:
      "Repairs beat replacements. If something breaks, we would rather fix it than sell you a new one.",
  },
  {
    icon: ShieldCheck,
    title: "Fair pricing",
    detail:
      "We publish the price and the shipping threshold up front. No surprise totals at the last step.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "We look for the problem",
    detail:
      "It starts with a gap we actually have — something that breaks, or a trip that needs a better bag.",
  },
  {
    step: "02",
    title: "We test it ourselves",
    detail:
      "Anything new is used at home for weeks before it goes anywhere near the site.",
  },
  {
    step: "03",
    title: "We buy the small run",
    detail:
      "No speculative inventory. We order in small batches from makers we know by name.",
  },
  {
    step: "04",
    title: "We tell you the truth",
    detail:
      "Measurements, materials, and the compromises. If something is not perfect, we say so first.",
  },
];

const About = () => (
  <main className="bg-white">
    <section className="bg-neutral-950 px-5 py-16 text-white sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-360">
        <p className="text-xs font-semibold tracking-[0.16em] text-amber-300 uppercase">
          Astra / About
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.1] font-medium sm:text-6xl">
          Considered pieces for everyday life.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-white/70">
          Astra began as a short list of things that survived a year of daily use.
          It is now a small shop, but the list is still short — and that is the
          point.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/collection"
            className="inline-flex min-h-12 items-center gap-2 bg-amber-300 px-6 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white"
          >
            Explore the collection{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex min-h-12 items-center gap-2 border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>

    <section className="border-b border-neutral-200 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto grid max-w-360 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { value: "1,200+", label: "Orders shipped" },
          { value: "30 days", label: "Returns, no questions" },
          { value: "$75", label: "Free tracked shipping" },
          { value: "4.9 / 5", label: "Average customer rating" },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-medium tracking-tight text-neutral-950 tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1.5 text-sm text-neutral-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-360 px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
            Our story
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-medium sm:text-4xl">
            A shop built around keeping things, not replacing them.
          </h2>
        </div>
        <div className="space-y-5 text-sm leading-7 text-neutral-600">
          <p>
            Astra started in a spare room with a shared spreadsheet and one
            stubborn idea: that most people do not need more objects, they need
            fewer objects that do not disappoint. So we began listing only what
            we would happily use ourselves.
          </p>
          <p>
            That rule still shapes everything. We are not interested in a restock
            every fortnight. When something sells out, it may take a while to come
            back, and that is deliberate — it gives us time to check the quality
            rather than chase the volume.
          </p>
          <p>
            We are a small team and we do the support ourselves. When you email
            us, you are writing to the people who chose the products, not a
            ticket queue.
          </p>
        </div>
      </div>
    </section>

    <section className="border-y border-neutral-200 bg-[#f4f3ef] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-360">
        <p className="text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
          What we hold to
        </p>
        <h2 className="mt-3 max-w-xl text-3xl leading-tight font-medium sm:text-4xl">
          Four things we will not trade away.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <article
              key={value.title}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                <value.icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-neutral-950">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {value.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-360 px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
            How a piece gets here
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-medium sm:text-4xl">
            From first idea to your doorstep.
          </h2>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Nothing goes live the week it arrives. Here is the path every product
            takes.
          </p>
        </div>
        <ol className="space-y-6 border-l border-neutral-200 pl-6">
          {STEPS.map((entry) => (
            <li key={entry.step} className="relative">
              <span className="absolute top-1 -left-[1.9rem] flex size-3 items-center justify-center rounded-full bg-amber-600 ring-4 ring-white" />
              <p className="text-xs font-semibold tracking-widest text-amber-800 tabular-nums">
                {entry.step}
              </p>
              <h3 className="mt-1 text-base font-semibold text-neutral-950">
                {entry.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-neutral-600">
                {entry.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="bg-neutral-950 px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto flex max-w-360 flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <Sparkles size={22} className="text-amber-300" aria-hidden="true" />
          <h2 className="mt-4 text-3xl leading-tight font-medium sm:text-4xl">
            Start with the short list.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            The collection is deliberately small. Have a look, and if something
            catches your eye, we will have put it there for a reason.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/collection"
            className="inline-flex min-h-12 items-center gap-2 bg-amber-300 px-6 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white"
          >
            Browse the collection{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex min-h-12 items-center gap-2 border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            <PackageCheck size={16} aria-hidden="true" />
            Ask a question
          </Link>
        </div>
      </div>
    </section>
  </main>
);

export default About;
