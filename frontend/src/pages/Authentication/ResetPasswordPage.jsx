import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle, ArrowLeft } from "lucide-react";
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
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !token) {
      setError("Thiếu thông tin xác thực mã token hoặc email từ đường dẫn liên kết.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Có lỗi xảy ra khi đặt lại mật khẩu.");
        return;
      }

      setMessage(data.message || "Mật khẩu mới đã được thiết lập thành công!");
      setPassword("");
      setConfirmPassword("");
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

      {/* Glassmorphism Card */}
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
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            Create a secure new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            
            {/* New Password Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-password"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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

            {/* Re-enter Password Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-confirm-password"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="lp-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 pr-12 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Success Message */}
            {message && (
              <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-xl p-3.5 backdrop-blur-md">
                <span className="text-sm">✓</span>
                <span>{message}</span>
              </div>
            )}

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
              className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity=".75" />
                  </svg>
                  Resetting password…
                </span>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          {/* Footer Back to Login link */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
