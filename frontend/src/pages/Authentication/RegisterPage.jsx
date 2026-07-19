import { useState, useEffect } from "react";
import { API_URL } from "@/config/api.js";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle, GraduationCap, BookOpen } from "lucide-react";
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
import { Label } from "@/components/ui/label";

const inputClass =
  "bg-white/60 dark:bg-black/40 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm outline-none placeholder:text-purple-300/80 focus-visible:ring-2 focus-visible:ring-purple-500/25";

const labelClass =
  "text-xs font-bold uppercase tracking-wider text-purple-900/70 dark:text-purple-200/70";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mssv, setMssv] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP State
  const [otpPendingEmail, setOtpPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState(Array(6).fill(""));
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes

  // Handle redirect from login page due to pending OTP
  useEffect(() => {
    if (location.state?.email) {
      setOtpPendingEmail(location.state.email);
      setOtpTimer(300);
      setSuccess(language === "vi" ? "Tài khoản chưa được xác thực OTP. Vui lòng hoàn tất xác thực!" : "Account has not been verified with OTP. Please complete verification!");
      setTimeout(() => setSuccess(""), 5000);
    }
  }, [location.state, language]);

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

    // Shift focus to the correct element
    const inputs = document.querySelectorAll(".otp-field");
    const nextFocusIndex = Math.min(pastedData.length, 5);
    inputs[nextFocusIndex]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const code = otpCode.join("");
    if (code.length < 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }

    try {
      setOtpLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpPendingEmail,
          otp: code,
          purpose: "REGISTER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Mã xác thực OTP không chính xác hoặc đã hết hạn.");
        return;
      }

      if (data.status === "pending_approval") {
        setSuccess(data.message || "Xác thực thành công! Vui lòng chờ Admin phê duyệt tài khoản giảng viên.");
        setOtpPendingEmail("");
        setTimeout(() => navigate("/login"), 4000);
        return;
      }

      // Successful auto-login for student
      const { token, user } = data;
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      setSuccess("Xác thực tài khoản thành công!");
      setTimeout(() => navigate("/"), 1500);

    } catch (err) {
      setError("Không thể kết nối đến server để xác thực OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpPendingEmail,
          purpose: "REGISTER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gửi lại mã OTP thất bại.");
        return;
      }

      setOtpCode(Array(6).fill(""));
      setOtpTimer(300);
      setSuccess("Mã OTP mới đã được gửi thành công!");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Không thể kết nối đến server.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim() || !email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ tất cả các trường thông tin bắt buộc.");
      return;
    }

    if (role === "STUDENT") {
      const mssvTrimmed = mssv.trim();
      if (!mssvTrimmed) {
        setError("Mã số sinh viên (MSSV) là bắt buộc đối với sinh viên.");
        return;
      }
      if (!/^[A-Za-z]{2}\d{6}$/.test(mssvTrimmed)) {
        setError("MSSV phải bắt đầu bằng 2 chữ cái và theo sau là 6 chữ số (ví dụ: se190808).");
        return;
      }
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          mssv: role === "STUDENT" ? mssv.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đăng ký thất bại. Vui lòng thử lại.");
        return;
      }

      if (data.status === "pending_otp") {
        setOtpPendingEmail(data.email || email);
        setOtpTimer(300);
        setSuccess(language === "vi" ? "Đăng ký thành công! Vui lòng nhập mã OTP 6 chữ số." : "Registration successful! Please enter the 6-digit OTP code.");
        setTimeout(() => setSuccess(""), 4000);
        return;
      }

    } catch {
      setError(t("auth.error_connection"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 select-none">
      {/* Background */}
      <img
        src={bgLogin}
        alt="background"
        className="lp-bg absolute inset-0 w-full h-full object-cover z-0"
      />

      <Card className="lp-card relative z-10 w-full max-w-[560px] border border-white/80 dark:border-white/10 shadow-2xl rounded-[28px] overflow-hidden bg-white/72 dark:bg-black/55 backdrop-blur-[24px] saturate-[1.6] p-7 md:p-9 outline-[1.5px] outline-purple-500/25 dark:outline-purple-500/10">
        <CardHeader className="p-0 gap-0">
          {/* Logo dots */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="AIStudyHub Logo" className="w-9 h-9 rounded-xl object-contain" />
              <span className="text-sm font-black text-purple-800 dark:text-purple-300 tracking-widest uppercase">
                AIStudyHub
              </span>
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
            {otpPendingEmail ? (language === "vi" ? "Xác thực OTP" : "Verify OTP") : t("auth.create_account")}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-purple-900/50 dark:text-purple-100/50 mb-6">
            {otpPendingEmail
              ? (language === "vi" ? "Vui lòng kiểm tra email của bạn để lấy mã OTP xác thực 6 chữ số." : "Please check your email to retrieve the 6-digit verification OTP code.")
              : t("auth.join_us")}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {otpPendingEmail ? (
            /* OTP Entry Form */
            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6 animate-in fade-in duration-300" noValidate>
              <div className="text-center bg-white/30 dark:bg-black/20 rounded-2xl p-4 border border-purple-500/10">
                <p className="text-xs font-semibold text-purple-900/60 dark:text-purple-200/50">
                  {language === "vi" ? "Mã xác thực đã được gửi đến email:" : "Verification code has been sent to email:"}
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
                  {language === "vi" ? "Mã hết hiệu lực sau:" : "Code expires in:"} <span className="font-mono text-purple-600 dark:text-purple-400">{formatTime(otpTimer)}</span>
                </span>
                <button
                  type="button"
                  disabled={otpTimer > 0 || otpLoading}
                  onClick={handleResendOtp}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {language === "vi" ? "Gửi lại mã" : "Resend code"}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-xl p-3.5 backdrop-blur-md">
                  <span>✅</span>
                  <span>{success}</span>
                </div>
              )}

              {/* Submit / Back Action */}
              <div className="flex flex-col gap-2.5">
                <Button
                  id="lp-verify-otp-btn"
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none"
                >
                  {otpLoading ? (language === "vi" ? "Đang xác thực…" : "Verifying...") : (language === "vi" ? "Xác nhận kích hoạt" : "Confirm activation")}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpPendingEmail("");
                    setError("");
                    setSuccess("");
                    setOtpCode(Array(6).fill(""));
                  }}
                  className="w-full py-3 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all"
                >
                  {language === "vi" ? "Quay lại đăng ký" : "Back to registration"}
                </button>
              </div>
            </form>
          ) : (
            /* Normal Sign Up Form */
            <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-in fade-in duration-300" noValidate>

              {/* Role Selector */}
              <div className="grid gap-1.5">
                <Label className={labelClass}>{t("auth.role")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${role === "STUDENT"
                        ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-500/20"
                        : "border-white/30 dark:border-white/10 bg-white/40 dark:bg-black/20 text-purple-900/60 dark:text-purple-200/50 hover:bg-purple-500/10"
                      }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    {t("auth.student")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("LECTURER")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${role === "LECTURER"
                        ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-500/20"
                        : "border-white/30 dark:border-white/10 bg-white/40 dark:bg-black/20 text-purple-900/60 dark:text-purple-200/50 hover:bg-purple-500/10"
                      }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("auth.lecturer")}
                  </button>
                </div>
                {role === "LECTURER" && (
                  <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70 mt-0.5 pl-0.5">
                    {language === "vi" ? "Tài khoản giảng viên sẽ chờ Admin xác nhận trước khi kích hoạt." : "Lecturer accounts will await Admin approval before activation."}
                  </p>
                )}
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="reg-firstname" className={labelClass}>
                    {t("auth.last_name")}
                  </Label>
                  <Input
                    id="reg-firstname"
                    type="text"
                    placeholder={language === "vi" ? "Nguyễn" : "e.g. John"}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="reg-lastname" className={labelClass}>
                    {t("auth.first_name")}
                  </Label>
                  <Input
                    id="reg-lastname"
                    type="text"
                    placeholder="Văn A"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* MSSV — only for students */}
              {role === "STUDENT" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="reg-mssv" className={labelClass}>
                    {language === "vi" ? "Mã số sinh viên (MSSV)" : "Student ID (MSSV)"}
                  </Label>
                  <Input
                    id="reg-mssv"
                    type="text"
                    placeholder={language === "vi" ? "Ví dụ: SE19xxxx" : "e.g. SE19xxxx"}
                    value={mssv}
                    onChange={(e) => setMssv(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              )}

              {/* Email */}
              <div className="grid gap-1.5">
                <Label htmlFor="reg-email" className={labelClass}>
                  {t("auth.email")}
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <div className="grid gap-1.5">
                <Label htmlFor="reg-password" className={labelClass}>
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={language === "vi" ? "Tối thiểu 6 ký tự" : "At least 6 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? (language === "vi" ? "Ẩn mật khẩu" : "Hide password") : (language === "vi" ? "Hiện mật khẩu" : "Show password")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Re-enter Password */}
              <div className="grid gap-1.5">
                <Label htmlFor="reg-confirm-password" className={labelClass}>
                  {t("auth.confirm_password")}
                </Label>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={language === "vi" ? "Nhập lại mật khẩu" : "Confirm your password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? (language === "vi" ? "Ẩn mật khẩu" : "Hide password") : (language === "vi" ? "Hiện mật khẩu" : "Show password")}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md mt-1">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-xl p-3.5 backdrop-blur-md mt-1">
                  <span>✅</span>
                  <span>{success}</span>
                </div>
              )}

              {/* Submit */}
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
                    {t("auth.registering")}
                  </span>
                ) : (
                  t("auth.register_btn")
                )}
              </Button>
            </form>
          )}

          {/* Social Register Divider */}
          {!otpPendingEmail && (
            <>
              <div className="flex items-center text-xs text-purple-900/35 dark:text-purple-200/35 font-bold uppercase tracking-wider my-5">
                <div className="flex-1 h-px bg-purple-500/15" />
                <span className="mx-4">{language === "vi" ? "Hoặc đăng ký nhanh" : "Or register quickly"}</span>
                <div className="flex-1 h-px bg-purple-500/15" />
              </div>

              {/* Google Register Button */}
              <a
                href={`${API_URL}/api/auth/google`}
                id="google-register-btn"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white text-sm font-semibold py-3 transition-all duration-200 shadow-sm select-none"
              >
                <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {language === "vi" ? "Đăng ký với Google" : "Sign up with Google"}
              </a>

              {/* GitHub Register Button */}
              <a
                href={`${API_URL}/api/auth/github`}
                id="github-register-btn"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-white text-sm font-semibold py-3 transition-all duration-200 shadow-sm select-none"
              >
                <svg height="20" width="20" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" fill="white">
                  <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
                </svg>
                {language === "vi" ? "Đăng ký với GitHub" : "Sign up with GitHub"}
              </a>

              {/* Facebook Register Button */}
              <a
                href={`${API_URL}/api/auth/facebook`}
                id="facebook-register-btn"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#1877f2]/40 bg-[#1877f2] hover:bg-[#166fe5] text-white text-sm font-semibold py-3 transition-all duration-200 shadow-sm select-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {language === "vi" ? "Đăng ký với Facebook" : "Sign up with Facebook"}
              </a>
            </>
          )}

          {/* Footer Sign In */}
          {!otpPendingEmail && (
            <p className="text-center text-sm text-purple-900/50 dark:text-purple-100/50 mt-6">
              {t("auth.has_account")}{" "}
              <a
                href="/login"
                className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
              >
                {t("auth.log_in_now")}
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
