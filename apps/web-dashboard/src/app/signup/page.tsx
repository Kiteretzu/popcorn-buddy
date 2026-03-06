"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/lib/api";
import { setAuthCookie } from "@/lib/auth-cookie";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (!err || typeof err !== "object") return "Registration failed";
    const rec = err as Record<string, unknown>;
    const apiError = rec.error;
    const message = rec.message;
    if (typeof apiError === "string" && apiError.trim()) return apiError;
    if (typeof message === "string" && message.trim()) return message;
    return "Registration failed";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signup(email, password, name);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setAuthCookie(res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Wallpaper background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/movies.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          aria-hidden
        />
      </div>
      <div className="absolute inset-0 bg-slate-900/70" aria-hidden />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <Image
            src="/assets/logo.png"
            alt="Popcorn Buddies"
            width={100}
            height={100}
          />
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-muted mt-2">Start watching with Popcorn Buddies</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-primary-dark border border-foreground rounded-2xl p-8 space-y-5 shadow-2xl"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-subtle mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-foreground border border-strong text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-tertiary focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-subtle mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-foreground border border-strong text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-tertiary focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-subtle mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              minLength={8}
              className="w-full bg-foreground border border-strong text-white rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-tertiary focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-tertiary/80 to-rose-500/70 text-white rounded-lg py-3 text-lg font-semibold hover:from-red-quaternary hover:to-rose-700 disabled:opacity-50 hover:cursor-pointer focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/" className="text-blue-secondary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
