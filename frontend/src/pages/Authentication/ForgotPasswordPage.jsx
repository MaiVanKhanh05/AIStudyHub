import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertTriangle, ArrowLeft } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng điền địa chỉ email.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }

      setMessage(data.message || "Yêu cầu đặt lại mật khẩu đã được gửi!");
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
            Forgot Password
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            Enter your email to receive a secure password reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Email Field */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="lp-email"
                className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70"
              >
                Email Address
              </Label>
              <Input
                id="lp-email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
              />
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
                  Sending link…
                </span>
              ) : (
                "Send Reset Link"
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
