import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
} from "lucide-react";
import api from "../lib/api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const requestCode = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/reset-otp", { email });
      if (!data.success)
        throw new Error(data.message || "Could not send a reset code.");
      setStep("reset");
      setMessage("A reset code is on its way. It is valid for 10 minutes.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not send a reset code.",
      );
    } finally {
      setPending(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      if (!data.success)
        throw new Error(data.message || "Could not update your password.");
      navigate("/account", { replace: true, state: { passwordReset: true } });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not update your password.",
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
              Account security
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-medium leading-tight sm:text-5xl">
              A fresh start.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              We’ll help you get back into your account with a one-time email
              code.
            </p>
          </div>
          <Link
            to="/account"
            className="mt-10 inline-flex w-fit items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Back to sign in
          </Link>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
          <div className="flex size-12 items-center justify-center bg-amber-100 text-amber-900">
            <Mail size={21} aria-hidden="true" />
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            Password reset
          </p>
          <h2 className="mt-2 text-3xl font-medium text-neutral-950">
            {step === "email"
              ? "Let’s get you back in."
              : "Choose a new password."}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
            {step === "email"
              ? "Enter the email address on your account and we’ll send a reset code."
              : `Enter the code sent to ${email} and choose a new password.`}
          </p>

          {step === "email" ? (
            <form onSubmit={requestCode} className="mt-8 max-w-md space-y-5">
              <label className="block text-sm font-medium text-neutral-800">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
              >
                {pending && (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                Send reset code <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <form onSubmit={updatePassword} className="mt-8 max-w-md space-y-5">
              <label className="block text-sm font-medium text-neutral-800">
                6-digit reset code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3 text-center text-lg tracking-[0.4em] outline-none transition-colors focus:border-neutral-950"
                />
              </label>
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-neutral-800"
                >
                  New password
                </label>
                <div className="relative mt-2">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-12 w-full border border-neutral-300 bg-white px-3 pr-12 text-sm outline-none transition-colors focus:border-neutral-950"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-neutral-950"
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Use at least 8 characters.
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="text-sm text-emerald-800">
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={pending || otp.length !== 6}
                className="flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending && (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                Update password <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          )}
          {step === "reset" && (
            <button
              type="button"
              disabled={pending}
              onClick={requestCode}
              className="mt-5 w-fit text-sm font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-950 disabled:opacity-50"
            >
              Resend reset code
            </button>
          )}
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
