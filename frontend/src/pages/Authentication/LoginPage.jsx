import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import bgLogin from "../../assets/background-login.png";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google pending registration states
  const [googlePending, setGooglePending] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleFirstName, setGoogleFirstName] = useState("");
  const [googleLastName, setGoogleLastName] = useState("");
  const [mssv, setMssv] = useState("");

  useEffect(() => {
    // Dynamically load Google accounts Identity Services library
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          // Read from Vite env variables
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id-here.apps.googleusercontent.com",
          callback: handleGoogleLogin,
        });

        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleLogin = async (googleResponse) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleResponse.credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đăng nhập Google thất bại");
        return;
      }

      if (data.status === "pending_registration") {
        setGoogleEmail(data.email || "");
        setGoogleFirstName(data.firstName || "");
        setGoogleLastName(data.lastName || "");
        setMssv("");
        setGooglePending(true);
        return;
      }

      const { token, user } = data;

      if (rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      // Redirect theo role: admin → /admin, còn lại → /
      navigate(user?.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError("Không thể kết nối đến server hoặc xác thực Google thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!mssv.trim()) {
      setError("Mã số sinh viên/giảng viên (UserID) là bắt buộc!");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/auth/google-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          firstName: googleFirstName,
          lastName: googleLastName,
          userId: mssv
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // "nếu trùng sẽ thông báo đã có userID và quay lại trang đăng nhập"
        alert(data.error || "Mã số sinh viên/giảng viên (UserID) đã tồn tại trên hệ thống!");
        
        // Return to login screen
        setGooglePending(false);
        setGoogleEmail("");
        setGoogleFirstName("");
        setGoogleLastName("");
        setMssv("");
        setError(data.error || "Mã số sinh viên/giảng viên đã tồn tại.");
        return;
      }

      const { token, user } = data;

      if (rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      navigate(user?.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      setError("Không thể kết nối đến server để hoàn tất đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }

      const { token, user } = data;

      if (rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      // Redirect theo role: ADMIN → /admin, còn lại → /
      navigate(user?.role === "ADMIN" ? "/admin" : "/");

    } catch (err) {
      setError("Không thể kết nối đến server. Hãy đảm bảo backend đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 select-none">
      {/* Background Image */}
      <img src={bgLogin} alt="background" className="lp-bg absolute inset-0 w-full h-full object-cover z-0" />

      {/* Glassmorphism Card styled with Shadcn Card base */}
      <Card className="lp-card relative z-10 w-full max-w-[540px] border border-white/80 dark:border-white/10 shadow-2xl rounded-[28px] overflow-hidden bg-white/72 dark:bg-black/55 backdrop-blur-[24px] saturate-[1.6] p-7 md:p-9 outline-[1.5px] outline-purple-500/25 dark:outline-purple-500/10">
        <CardHeader className="p-0 gap-0">
          {/* Logo / Brand header */}
          <div className="flex items-center gap-1 mb-5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-85" />
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-60" />
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-35" />
            <span className="text-xs font-extrabold text-purple-800 dark:text-purple-300 tracking-wider ml-1 uppercase">AIStudyHub</span>
          </div>

          <CardTitle className="text-3xl font-extrabold text-[#1a0d2e] dark:text-white tracking-tight leading-none mb-1">
            {googlePending ? "Hoàn tất đăng ký" : "Hi there!"}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            {googlePending
              ? "Vui lòng bổ sung mã số sinh viên/giảng viên và điều chỉnh tên của bạn."
              : "Have we met before?"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Normal Login Form */}
          <form
            onSubmit={handleLogin}
            className={googlePending ? "hidden" : "flex flex-col gap-4"}
            noValidate
          >
            {/* Email Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-email"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                Email
              </Label>
              <Input
                id="lp-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
              />
            </div>

            {/* Password Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-password"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 pr-12 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lp-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  className="border-purple-500/40 rounded-[5px] data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label
                  htmlFor="lp-remember"
                  className="text-sm font-semibold text-purple-900/60 dark:text-purple-200/60 cursor-pointer select-none"
                >
                  Remember me
                </Label>
              </div>
              <a
                href="/forgot-password"
                className="text-xs font-semibold text-purple-500 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                Forgot my password
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              id="lp-submit"
              type="submit"
              disabled={loading}
              className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity=".75" />
                  </svg>
                  Logging in…
                </span>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          {/* Google Complete Registration Form */}
          <form
            onSubmit={handleGoogleRegisterSubmit}
            className={!googlePending ? "hidden" : "flex flex-col gap-4"}
            noValidate
          >
            {/* Email (Readonly) */}
            <div className="grid gap-1.5 opacity-75">
              <Label className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                Email Google
              </Label>
              <Input
                type="email"
                value={googleEmail}
                disabled
                className="bg-white/40 dark:bg-black/20 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none cursor-not-allowed text-purple-900/60 dark:text-purple-200/60"
              />
            </div>

            {/* Last Name & First Name Fields in Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                  Họ
                </Label>
                <Input
                  type="text"
                  placeholder="Họ của bạn"
                  value={googleLastName}
                  onChange={(e) => setGoogleLastName(e.target.value)}
                  required
                  className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                  Tên
                </Label>
                <Input
                  type="text"
                  placeholder="Tên của bạn"
                  value={googleFirstName}
                  onChange={(e) => setGoogleFirstName(e.target.value)}
                  required
                  className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                />
              </div>
            </div>

            {/* MSSV / MSGV - Required */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                Mã số sinh viên / Giảng viên (MSSV / MSGV) *
              </Label>
              <Input
                type="text"
                placeholder="Nhập MSSV hoặc MSGV để làm UserID"
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                required
                className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions for complete registration */}
            <div className="flex flex-col gap-2 mt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none"
              >
                {loading ? "Đang xử lý..." : "Hoàn tất đăng ký"}
              </Button>
              
              <button
                type="button"
                onClick={() => {
                  setGooglePending(false);
                  setError("");
                }}
                className="w-full py-3.5 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </form>

          {/* Social Sign In Divider & Button */}
          <div className={googlePending ? "hidden" : "block"}>
            {/* Divider */}
            <div className="flex items-center text-xs text-purple-900/35 dark:text-purple-200/35 font-bold uppercase tracking-wider my-5">
              <div className="flex-1 h-px bg-purple-500/15" />
              <span className="mx-4">OR</span>
              <div className="flex-1 h-px bg-purple-500/15" />
            </div>

            {/* Google Login Button */}
            <div className="w-full flex justify-center mt-1 select-none">
              <div id="google-signin-btn" className="w-full" />
            </div>

            {/* Footer Sign Up link */}
            <p className="text-center text-sm text-purple-900/50 dark:text-purple-100/50 mt-6">
              Don't have an account?{" "}
              <a
                href="/register"
                className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                Sign Up
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
