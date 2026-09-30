import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/api";
import { setUser } from "../redux/userSlice";

const VerifyEmail = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    location.state?.codeSent ? "We sent a 6-digit code to your inbox." : "",
  );

  const sendCode = async () => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/api/auth/otp");
      if (!data.success)
        throw new Error(data.message || "Could not send a verification code.");
      setMessage(
        "A fresh verification code is on its way. It is valid for 10 minutes.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not send a verification code.",
      );
    } finally {
      setPending(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/verify-email", { otp });
      if (!data.success)
        throw new Error(data.message || "That code could not be verified.");
      dispatch(setUser({ ...user, isVerified: true }));
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "That code could not be verified.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-150px)] bg-[#f4f3ef] px-4 py-12 sm:px-6 sm:py-20">
      <section className="mx-auto grid max-w-5xl overflow-hidden border border-neutral-200 bg-white shadow-[0_24px_80px_-40px_rgba(0,0,0,0.3)] md:grid-cols-[0.85fr_1.15fr]">
        <aside className="flex min-h-56 flex-col justify-between bg-neutral-950 p-7 text-white sm:p-10 md:min-h-140">
          <Link to="/" className="w-fit text-2xl font-semibold">
            astra<span className="text-amber-300">.</span>
          </Link>
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-300">
              One last step
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-medium leading-tight sm:text-5xl">
              Make it yours.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Verify your email to keep your account and orders connected to
              you.
            </p>
          </div>
          <Link
            to="/account"
            className="mt-10 inline-flex w-fit items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Back to account
          </Link>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
          {user ? (
            <>
              <div className="flex size-12 items-center justify-center bg-amber-100 text-amber-900">
                <MailCheck size={22} aria-hidden="true" />
              </div>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Email verification
              </p>
              <h2 className="mt-2 text-3xl font-medium text-neutral-950">
                Check your inbox.
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-neutral-900">
                  {user.email}
                </span>
                .
              </p>

              <form onSubmit={verifyCode} className="mt-8 max-w-md">
                <label
                  htmlFor="verification-code"
                  className="text-sm font-medium text-neutral-800"
                >
                  Verification code
                </label>
                <input
                  id="verification-code"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  className="mt-2 h-14 w-full border border-neutral-300 bg-white px-4 text-center text-xl tracking-[0.45em] outline-none transition-colors focus:border-neutral-950"
                />
                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                {message && (
                  <p role="status" className="mt-3 text-sm text-emerald-800">
                    {message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending || otp.length !== 6}
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pending && (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Verify email <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
              <button
                type="button"
                onClick={sendCode}
                disabled={pending}
                className="mt-5 w-fit text-sm font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-950 disabled:opacity-50"
              >
                Send a new code
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Email verification
              </p>
              <h2 className="mt-2 text-3xl font-medium text-neutral-950">
                Sign in to continue.
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Your account session is needed to verify this email address.
              </p>
              <Link
                to="/account"
                className="mt-7 inline-flex min-h-12 w-fit items-center gap-3 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Go to sign in <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default VerifyEmail;
