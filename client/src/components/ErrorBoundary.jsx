import { Component } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Last line of defence: a render crash shows a recoverable screen instead of a
 * blank white page. Catching this is what separates a demo from production.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f3ef] px-5">
        <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(0,0,0,0.3)]">
          <AlertTriangle
            size={26}
            className="mx-auto text-amber-800"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-medium text-neutral-950">
            Something went wrong.
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            The page could not finish loading. Reloading usually fixes it — if it
            keeps happening, check that the store API is running.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            <RotateCw size={15} aria-hidden="true" />
            Reload the page
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
