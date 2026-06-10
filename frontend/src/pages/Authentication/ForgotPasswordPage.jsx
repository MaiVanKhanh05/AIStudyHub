import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertTriangle, ArrowLeft, Eye, EyeOff } from "lucide-react";
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

  // OTP Reset State
  const [otpPendingEmail, setOtpPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState(Array(6).fill(""));
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (otpPendingEmail && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpPendingEmail, otpTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleOtpChange = (element, index) => {
    const value = element.value.replace(/[^0-9]/g, ""); // digits only
    if (!value) {
      const newOtp = [...otpCode];
      newOtp[index] = "";
      setOtpCode(newOtp);
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1); // take last char
    setOtpCode(newOtp);

    // Auto focus next input
    if (element.nextSibling && value) {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpCode[index] && e.target.previousSibling) {
        e.target.previousSibling.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().substring(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otpCode];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpCode(newOtp);

    // Shift focus
    const inputs = document.querySelectorAll(".otp-field");
    const nextFocusIndex = Math.min(pastedData.length, 5);
    inputs[nextFocusIndex]?.focus();
  };

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

      if (data.status === "pending_otp") {
        setOtpPendingEmail(data.email || email);
        setOtpTimer(300);
        setMessage("Mã xác thực OTP đã được gửi! Vui lòng nhập mã OTP để đặt lại mật khẩu.");
        setTimeout(() => setMessage(""), 4000);
        return;
      }

      setMessage(data.message || "Yêu cầu đặt lại mật khẩu đã được gửi!");
    } catch (err) {
      setError("Không thể kết nối đến server. Hãy đảm bảo backend đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const code = otpCode.join("");
    if (code.length < 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ mật khẩu mới.");
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
      setOtpLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpPendingEmail,
          token: code, // pass OTP as token
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Mã OTP không đúng hoặc đặt lại mật khẩu thất bại.");
        return;
      }

      setMessage("Đặt lại mật khẩu thành công! Trình duyệt đang chuyển về màn hình Đăng nhập...");
      setOtpPendingEmail("");
      setTimeout(() => navigate("/login"), 3500);

    } catch (err) {
      setError("Không thể kết nối đến server để đặt lại mật khẩu.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("http://localhost:5000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpPendingEmail,
          purpose: "RESET_PASSWORD",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gửi lại mã OTP thất bại.");
        return;
      }

      setOtpCode(Array(6).fill(""));
      setOtpTimer(300);
      setMessage("Mã OTP mới đã được gửi thành công!");
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setError("Không thể kết nối đến server.");
    } finally {
      setOtpLoading(false);
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
            {otpPendingEmail ? "Đặt lại mật khẩu" : "Quên mật khẩu"}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            {otpPendingEmail
              ? "Vui lòng nhập mã OTP 6 chữ số và thiết lập mật khẩu mới."
              : "Nhập địa chỉ email của bạn để nhận mã xác thực đặt lại mật khẩu."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {otpPendingEmail ? (
            /* Reset password with OTP Form */
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-5 animate-in fade-in duration-300" noValidate>
              <div className="text-center bg-white/30 dark:bg-black/20 rounded-2xl p-4 border border-purple-500/10">
                <p className="text-xs font-semibold text-purple-900/60 dark:text-purple-200/50">
                  Mã OTP đặt lại mật khẩu đã gửi đến email:
                </p>
                <p className="text-sm font-bold text-purple-800 dark:text-purple-300 mt-1 break-all select-all font-mono">
                  {otpPendingEmail}
                </p>
              </div>

              {/* OTP Grid */}
              <div className="flex justify-center gap-2 md:gap-3 py-1">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    className="otp-field w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold bg-white/60 dark:bg-black/40 border border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all text-purple-900 dark:text-white font-mono"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                  />
                ))}
              </div>

              {/* Countdown & Resend Option */}
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span className="text-purple-900/50 dark:text-purple-100/50">
                  Mã hết hiệu lực sau: <span className="font-mono text-purple-600 dark:text-purple-400">{formatTime(otpTimer)}</span>
                </span>
                <button
                  type="button"
                  disabled={otpTimer > 0 || otpLoading}
                  onClick={handleResendOtp}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Gửi lại mã
                </button>
              </div>

              {/* New Password Field */}
              <div className="grid gap-1.5 mt-1">
                <Label htmlFor="lp-password" className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                  Mật khẩu mới
                </Label>
                <div className="relative">
                  <Input
                    id="lp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 pr-12 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="grid gap-1.5">
                <Label htmlFor="lp-confirm-password" className="text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70">
                  Xác nhận mật khẩu mới
                </Label>
                <div className="relative">
                  <Input
                    id="lp-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 pr-12 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {message && (
                <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-xl p-3.5 backdrop-blur-md">
                  <span>✅</span>
                  <span>{message}</span>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex flex-col gap-2.5 mt-1">
                <Button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none"
                >
                  {otpLoading ? "Đang xử lý…" : "Đổi mật khẩu"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpPendingEmail("");
                    setError("");
                    setMessage("");
                    setOtpCode(Array(6).fill(""));
                  }}
                  className="w-full py-3 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all"
                >
                  Quay lại nhập Email
                </button>
              </div>
            </form>
          ) : (
            /* Email Request Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-in fade-in duration-300" noValidate>
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
                    Sending code…
                  </span>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </form>
          )}

          {/* Footer Back to Login link */}
          {!otpPendingEmail && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
