"use client";
import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { login } from "@/lib/api";
import { setAuthCookie } from "@/lib/auth-cookie";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (!err || typeof err !== "object") return "Login failed";
    const rec = err as Record<string, unknown>;
    const apiError = rec.error;
    const message = rec.message;
    if (typeof apiError === "string" && apiError.trim()) return apiError;
    if (typeof message === "string" && message.trim()) return message;
    return "Login failed";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(formData.email, formData.password);
      const token = res?.data?.token;
      if (!token) {
        setError("Login succeeded but no token received");
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setAuthCookie(token);
      // Full-page redirect so the cookie is sent and middleware can verify (middleware cannot see localStorage)
      window.location.assign("/dashboard");
      return;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Side - Enhanced Visual Section */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Video with Low Opacity */}
        <div className="absolute inset-0 opacity-15">
          <video
            className="h-full w-full object-cover"
            src="/assets/landing.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)`,
            }}
          ></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-glow rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-12 h-12 bg-accent rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-16 w-20 h-20 bg-highlight rounded-full blur-xl animate-pulse delay-2000"></div>

        <div className="relative z-10 flex flex-col justify-center items-center p-12 w-full">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-red-secondary to-red-primary rounded-2xl mb-8 shadow-2xl">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-white text-5xl font-bold mb-4 leading-tight">
              Admin
              <span className="bg-gradient-to-r from-blue-secondary to-cyan bg-clip-text text-transparent block">
                Control Center
              </span>
            </h1>
            <p className="text-subtle text-xl max-w-md mx-auto leading-relaxed">
              Manage your platform with powerful tools and real-time insights
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12 max-w-md">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center group hover:bg-white/10 transition-all duration-300">
              <BarChart3 className="w-8 h-8 text-blue-secondary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Analytics</h3>
              <p className="text-muted text-sm">Real-time data</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center group hover:bg-white/10 transition-all duration-300">
              <Users className="w-8 h-8 text-green mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Users</h3>
              <p className="text-muted text-sm">Manage accounts</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center group hover:bg-white/10 transition-all duration-300">
              <Settings className="w-8 h-8 text-purple mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Settings</h3>
              <p className="text-muted text-sm">System config</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center group hover:bg-white/10 transition-all duration-300">
              <Shield className="w-8 h-8 text-red-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">Security</h3>
              <p className="text-muted text-sm">Access control</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-1">99.9%</div>
              <div className="text-muted text-sm">Uptime</div>
            </div>
            <div className="w-px h-12 bg-strong"></div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-muted text-sm">Support</div>
            </div>
            <div className="w-px h-12 bg-strong"></div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">256-bit</div>
              <div className="text-muted text-sm">Encryption</div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
      </div>

      {/* Right Side - Login Section */}
      <div className="flex-1 lg:flex-none lg:w-96 xl:w-[480px] flex items-center justify-center p-8 relative overflow-hidden bg-slate-900">
        {/* Background image - scaled wrapper so rotated image still fills area */}
        <div className="absolute inset-0 opacity-20 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: "160%",
              height: "160%",
              transform: "translate(-50%, -50%) rotate(20deg)",
            }}
          >
            <Image
              src="/assets/movies.jpg"
              alt=""
              fill
              className="object-cover"
              aria-hidden
            />
          </div>
        </div>
        <div className="w-full max-w-md relative z-10">
          {/* Admin Header */}
          <div className="text-center mb-12">
            <div>
              <Image
                src="/assets/logo.png"
                alt="Admin Logo"
                width={64}
                height={64}
                className="mx-auto mb-4 rounded-full shadow-lg"
              />
            </div>
            <h1 className="text-white text-3xl font-bold mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted text-lg">
              Sign in to access the admin panel
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-primary-dark rounded-2xl p-8 border border-foreground shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              {/* Email field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-foreground text-white rounded-lg pl-10 pr-4 py-4 border border-strong focus:border-blue-tertiary focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-lg"
                  placeholder="Admin Email"
                  required
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-foreground text-white rounded-lg pl-10 pr-12 py-4 border border-strong focus:border-blue-tertiary focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-lg"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-tertiary/80 to-rose-500/70 text-white rounded-lg py-4 text-lg font-semibold hover:from-red-quaternary hover:to-rose-700 hover:cursor-pointer focus:ring-2 focus:ring-red-500/50 focus:outline-none transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                {loading ? "Signing in..." : "Access Dashboard"}
              </button>

              <p className="text-center text-sm text-muted">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-blue-secondary hover:underline"
                >
                  Create one
                </Link>
              </p>
            </form>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <div className="bg-primary-dark/50 border border-foreground rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <Lock className="h-4 w-4 text-blue-secondary mr-2" />
                <span className="text-subtle text-sm font-medium">
                  Secure Admin Access
                </span>
              </div>
              <p className="text-muted text-xs">
                This is a protected area. Only authorized administrators can
                access this dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
