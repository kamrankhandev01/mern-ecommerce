import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  UserRound,
} from "lucide-react";
import api from "../lib/api";
import { clearUser, setUser } from "../redux/userSlice";
import ProfileEditor from "../components/ProfileEditor";

const Account = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user.user);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setPending(true);
    try {
      const { data } = await api.post(`/api/auth/${mode}`, form);
      if (!data.success || !data.user)
        throw new Error(data.message || "We could not complete your request.");

      const responseUser = data.user;
      const returnTo = location.state?.from || "/";
      dispatch(
        setUser({
          _id: responseUser._id,
          name: responseUser.name,
          email: responseUser.email,
          role: responseUser.role,
          profileImage: responseUser.profileImage,
          isVerified: responseUser.isVerified,
        }),
      );
      if (!responseUser.isVerified) {
        const { data: otpData } = await api.post("/api/auth/otp");
        if (!otpData.success)
          throw new Error(
            otpData.message || "We could not send your verification code.",
          );
        navigate("/verify-email", {
          replace: true,
          state: { codeSent: true, from: returnTo },
        });
        return;
      }
      navigate(returnTo, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  const handleLogout = async () => {
    setPending(true);
    setError("");
    try {
      await api.post("/api/auth/logout");
      dispatch(clearUser());
      setSignedOut(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "We could not sign you out. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-150px)] bg-[#f4f3ef] px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-5xl overflow-hidden border border-neutral-200 bg-white shadow-[0_24px_80px_-40px_rgba(0,0,0,0.3)] md:grid-cols-[0.85fr_1.15fr]">
        <aside className="flex min-h-56 flex-col justify-between bg-neutral-950 p-7 text-white sm:p-10 md:min-h-140">
          <Link to="/" className="w-fit text-2xl font-semibold">
            astra<span className="text-amber-300">.</span>
          </Link>
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase text-amber-300">
              A better kind of everyday
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-medium leading-tight sm:text-5xl">
              Good finds. Kept close.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Sign in to keep your details together and make your next visit
              feel familiar.
            </p>
          </div>
          <Link
            to="/"
            className="mt-10 inline-flex w-fit items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
          >
            Back to the shop <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </aside>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
          {user ? (
            <div>
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                <UserRound size={21} aria-hidden="true" />
              </div>
              <p className="mt-7 text-xs font-semibold uppercase text-amber-700">
                Account
              </p>
              <h2 className="mt-2 text-3xl font-medium text-neutral-950">
                Welcome, {user.name}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                You’re signed in as {user.email}.
              </p>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  Open admin dashboard{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
              <div className="mt-8 border-y border-neutral-200 py-5">
                <p className="text-xs font-semibold uppercase text-neutral-500">
                  Email status
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-neutral-800">
                  {user.isVerified ? (
                    <>
                      <Check
                        size={16}
                        className="text-emerald-700"
                        aria-hidden="true"
                      />{" "}
                      Verified
                    </>
                  ) : (
                    "Not verified"
                  )}
                </p>
                {!user.isVerified && (
                  <Link
                    to="/verify-email"
                    className="mt-3 inline-flex text-sm font-semibold text-amber-800 underline underline-offset-4"
                  >
                    Verify your email
                  </Link>
                )}
              </div>
              {error && (
                <p role="alert" className="mt-5 text-sm text-red-700">
                  {error}
                </p>
              )}
              {signedOut && (
                <p role="status" className="mt-5 text-sm text-emerald-800">
                  You have signed out.
                </p>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={handleLogout}
                className="mt-7 inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-950 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <LogOut size={16} aria-hidden="true" />
                )}{" "}
                Sign out
              </button>
              <ProfileEditor user={user} />
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase text-amber-700">
                Your Astra account
              </p>
              <h2 className="mt-2 text-3xl font-medium text-neutral-950">
                {mode === "login" ? "Welcome back." : "Create your account."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {mode === "login"
                  ? "Sign in with the email address you registered with."
                  : "A few details and you’re all set."}
              </p>

              <div
                role="tablist"
                aria-label="Account access"
                className="mt-8 grid grid-cols-2 border-b border-neutral-200"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`border-b-2 py-3 text-sm font-medium transition-colors ${mode === "login" ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`border-b-2 py-3 text-sm font-medium transition-colors ${mode === "register" ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
                >
                  Create account
                </button>
              </div>

              {location.state?.passwordReset && (
                <p role="status" className="mt-5 text-sm text-emerald-800">
                  Password updated. Sign in with your new password.
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
                {mode === "register" && (
                  <label className="block text-sm font-medium text-neutral-800">
                    Full name
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      autoComplete="name"
                      required
                      className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
                    />
                  </label>
                )}
                <label className="block text-sm font-medium text-neutral-800">
                  Email address
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    autoComplete="email"
                    required
                    className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
                  />
                </label>
                <div>
                  <label
                    htmlFor="account-password"
                    className="block text-sm font-medium text-neutral-800"
                  >
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="account-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={updateField}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      minLength={mode === "register" ? 8 : undefined}
                      required
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
                  {mode === "register" && (
                    <span className="mt-2 block text-xs font-normal text-neutral-500">
                      Use at least 8 characters.
                    </span>
                  )}
                </div>
                {mode === "login" && (
                  <div className="-mt-1 flex justify-end">
                    <Link
                      to="/reset-password"
                      className="text-xs font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-950"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
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
                  {pending ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default Account;
