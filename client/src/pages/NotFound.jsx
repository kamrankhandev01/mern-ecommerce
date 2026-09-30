import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";

const NotFound = () => (
  <main className="flex min-h-[70vh] items-center justify-center bg-[#f4f3ef] px-5 py-16">
    <section className="w-full max-w-lg border border-neutral-200 bg-white p-8 text-center sm:p-12">
      <Compass size={26} className="mx-auto text-amber-800" aria-hidden="true" />
      <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-medium text-neutral-950 sm:text-4xl">
        This page has moved on.
      </h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        The link you followed is no longer here. The collection is a good place
        to pick things up again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/collection"
          className="inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Explore the collection{" "}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-950"
        >
          Back to home
        </Link>
      </div>
    </section>
  </main>
);

export default NotFound;
