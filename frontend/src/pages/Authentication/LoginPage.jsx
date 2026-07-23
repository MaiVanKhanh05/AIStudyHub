import { useState } from "react";
import { API_URL } from "@/config/api.js";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import bgLogin from "../../assets/background-login.png";
import logo from "../../assets/logo.png";
import { useLanguage } from "../../context/LanguageContext";

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
  const { t, language, setLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === "pending_otp") {
          navigate("/register", { state: { email: data.email } });
          return;
        }
        setError(data.error || t("auth.error_login_failed"));
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
      setError(t("auth.error_connection"));
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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="AIStudyHub Logo" className="w-9 h-9 rounded-xl object-contain" />
              <span className="text-sm font-black text-purple-800 dark:text-purple-300 tracking-widest uppercase">AIStudyHub</span>
            </div>
            
            {/* Language Selector */}
            <div className="flex p-0.5 bg-purple-500/5 dark:bg-white/5 border border-purple-500/10 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setLanguage("vi")}
                className={`h-7 px-2.5 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                  language === "vi"
                    ? "bg-purple-600 dark:bg-purple-500 text-white shadow-sm"
                    : "text-purple-900/50 hover:text-purple-900 dark:text-purple-100/50 dark:hover:text-white bg-transparent"
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`h-7 px-2.5 text-[10px] font-black rounded-lg transition-all duration-300 cursor-pointer ${
                  language === "en"
                    ? "bg-purple-600 dark:bg-purple-500 text-white shadow-sm"
                    : "text-purple-900/50 hover:text-purple-900 dark:text-purple-100/50 dark:hover:text-white bg-transparent"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <CardTitle className="text-3xl font-extrabold text-[#1a0d2e] dark:text-white tracking-tight leading-none mb-1">
            {t("auth.hi_there")}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            {t("auth.have_we_met")}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Normal Login Form */}
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-4"
            noValidate
          >
            {/* Email Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-email"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                {t("auth.email")}
              </Label>
              <Input
                id="lp-email"
                type="email"
                placeholder={t("auth.email")}
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
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.password")}
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
                  {t("auth.remember_me")}
                </Label>
              </div>
              <a
                href="/forgot-password"
                className="text-xs font-semibold text-purple-500 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                {t("auth.forgot_password")}
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
                  {t("auth.logging_in")}
                </span>
              ) : (
                t("auth.login_btn")
              )}
            </Button>
          </form>

          {/* Social Sign In Divider & Buttons */}
          <div>
            {/* Divider */}
            <div className="flex items-center text-xs text-purple-900/35 dark:text-purple-200/35 font-bold uppercase tracking-wider my-5">
              <div className="flex-1 h-px bg-purple-500/15" />
              <span className="mx-4">{t("auth.or")}</span>
              <div className="flex-1 h-px bg-purple-500/15" />
            </div>

            {/* Google Login Button — custom styled as anchor */}
            <a
              href={`${API_URL}/api/auth/google`}
              id="google-signin-btn"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white text-sm font-semibold py-3 transition-all duration-200 shadow-sm select-none"
            >
              {/* Google colour SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {t("auth.login_google")}
            </a>



            {/* Footer Sign Up link */}
            <p className="text-center text-sm text-purple-900/50 dark:text-purple-100/50 mt-6">
              {t("auth.no_account")}{" "}
              <a
                href="/register"
                className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                {t("auth.sign_up")}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
