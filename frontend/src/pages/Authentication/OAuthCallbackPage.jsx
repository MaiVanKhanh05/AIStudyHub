import { useEffect, useState } from "react";
import { API_URL } from "@/config/api.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, GraduationCap, BookOpen } from "lucide-react";
import bgLogin from "../../assets/background-login.png";
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

const PROVIDER_LABELS = {
  github: "GitHub",
  facebook: "Facebook",
  google: "Google",
};

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  const [status, setStatus] = useState("loading"); // loading | pending_registration | error
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");

  // Pending registration form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mssv, setMssv] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const userRaw = searchParams.get("user");
    const statusParam = searchParams.get("status");
    const errorParam = searchParams.get("error");
    const providerParam = searchParams.get("provider") || "oauth";

    setProvider(providerParam);

    if (errorParam) {
      const errorMessages = {
        no_code: language === "vi" ? "Xác thực bị hủy hoặc thất bại." : "Authentication cancelled or failed.",
        token_failed: language === "vi" ? "Không thể lấy token từ nhà cung cấp." : "Failed to obtain token from provider.",
        no_email: language === "vi" ? "Tài khoản của bạn không có email công khai. Vui lòng đặt email public trong cài đặt tài khoản." : "Your account does not have a public email. Please make it public in your account settings.",
        server_error: language === "vi" ? "Lỗi server nội bộ. Vui lòng thử lại." : "Internal server error. Please try again.",
        locked: language === "vi" ? "Tài khoản của bạn đã bị khóa bởi Admin!" : "Your account has been locked by the Admin!",
      };
      setError(errorMessages[errorParam] || (language === "vi" ? "Đăng nhập thất bại. Vui lòng thử lại." : "Login failed. Please try again."));
      setStatus("error");
      return;
    }

    if (token && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        navigate(user?.role === "ADMIN" ? "/admin" : "/", { replace: true });
      } catch {
        setError(language === "vi" ? "Dữ liệu phiên đăng nhập không hợp lệ." : "Invalid login session data.");
        setStatus("error");
      }
      return;
    }

    if (statusParam === "pending_registration") {
      setEmail(searchParams.get("email") || "");
      setFirstName(searchParams.get("firstName") || "");
      setLastName(searchParams.get("lastName") || "");
      setStatus("pending_registration");
      return;
    }

    setError(language === "vi" ? "Không nhận được thông tin xác thực hợp lệ." : "No valid authentication information received.");
    setStatus("error");
  }, [searchParams, navigate, language]);

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(language === "vi" ? "Vui lòng điền đầy đủ họ tên." : "Please fill in your full name.");
      return;
    }
    if (role === "STUDENT" && !mssv.trim()) {
      setFormError(language === "vi" ? "Mã số sinh viên (MSSV) là bắt buộc đối với sinh viên." : "Student ID (MSSV) is required for students.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("${API_URL}/api/auth/google-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          userId: role === "STUDENT" ? mssv.trim() : `LECT_${email.split("@")[0].toUpperCase()}`,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || (language === "vi" ? "Đăng ký thất bại. Vui lòng thử lại." : "Registration failed. Please try again."));
        return;
      }

      const { token, user } = data;
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      navigate(user?.role === "ADMIN" ? "/admin" : "/", { replace: true });
    } catch {
      setFormError(t("auth.error_connection"));
    } finally {
      setSubmitting(false);
    }
  };

  const providerLabel = PROVIDER_LABELS[provider] || provider;

  return (
    <div className="lp-root relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 select-none">
      <img src={bgLogin} alt="background" className="lp-bg absolute inset-0 w-full h-full object-cover z-0" />

      <Card className="lp-card relative z-10 w-full max-w-[520px] border border-white/80 dark:border-white/10 shadow-2xl rounded-[28px] overflow-hidden bg-white/72 dark:bg-black/55 backdrop-blur-[24px] saturate-[1.6] p-7 md:p-9 outline-[1.5px] outline-purple-500/25 dark:outline-purple-500/10">
        <CardHeader className="p-0 gap-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-85" />
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 opacity-35" />
              <span className="text-xs font-extrabold text-purple-800 dark:text-purple-300 tracking-wider ml-1 uppercase">AIStudyHub</span>
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

          {status === "loading" && (
            <>
              <CardTitle className="text-2xl font-extrabold text-[#1a0d2e] dark:text-white mb-1">{t("oauth.authenticating")}</CardTitle>
              <CardDescription className="text-sm text-purple-900/50 dark:text-purple-100/50 mb-6">
                {language === "vi" ? "Vui lòng chờ trong giây lát." : "Please wait a moment."}
              </CardDescription>
            </>
          )}

          {status === "pending_registration" && (
            <>
              <CardTitle className="text-2xl font-extrabold text-[#1a0d2e] dark:text-white mb-1">
                {t("oauth.register_title")}
              </CardTitle>
              <CardDescription className="text-sm text-purple-900/50 dark:text-purple-100/50 mb-6">
                {language === "vi" ? `Tài khoản ${providerLabel} của bạn đã xác thực thành công. Vui lòng bổ sung thông tin để tiếp tục.` : `Your ${providerLabel} account was authenticated successfully. Please provide additional information to proceed.`}
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <CardTitle className="text-2xl font-extrabold text-[#1a0d2e] dark:text-white mb-1">
                {t("oauth.error_title")}
              </CardTitle>
              <CardDescription className="text-sm text-purple-900/50 dark:text-purple-100/50 mb-6">
                {language === "vi" ? `Có lỗi xảy ra trong quá trình xác thực ${providerLabel}.` : `An error occurred during ${providerLabel} authentication.`}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading spinner */}
          {status === "loading" && (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-10 w-10 text-purple-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity=".75" />
              </svg>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <Button
                onClick={() => navigate("/login")}
                className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 rounded-xl"
              >
                {t("auth.back_to_login")}
              </Button>
            </div>
          )}

          {/* Pending registration form */}
          {status === "pending_registration" && (
            <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-4" noValidate>
              {/* Email — readonly */}
              <div className="grid gap-1.5 opacity-70">
                <Label className={labelClass}>Email ({providerLabel})</Label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-white/40 dark:bg-black/20 border-purple-500/20 dark:border-white/10 backdrop-blur-md rounded-xl px-4 py-5 text-sm cursor-not-allowed"
                />
              </div>

              {/* Role selector */}
              <div className="grid gap-1.5">
                <Label className={labelClass}>{t("auth.role")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${
                      role === "STUDENT"
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
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all duration-200 ${
                      role === "LECTURER"
                        ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-500/20"
                        : "border-white/30 dark:border-white/10 bg-white/40 dark:bg-black/20 text-purple-900/60 dark:text-purple-200/50 hover:bg-purple-500/10"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("auth.lecturer")}
                  </button>
                </div>
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className={labelClass}>{t("auth.last_name")}</Label>
                  <Input
                    type="text"
                    placeholder={language === "vi" ? "Họ của bạn" : "Your last name"}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className={labelClass}>{t("auth.first_name")}</Label>
                  <Input
                    type="text"
                    placeholder={language === "vi" ? "Tên của bạn" : "Your first name"}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* MSSV — students only */}
              {role === "STUDENT" && (
                <div className="grid gap-1.5">
                  <Label className={labelClass}>{language === "vi" ? "Mã số sinh viên (MSSV)" : "Student ID (MSSV)"}</Label>
                  <Input
                    type="text"
                    placeholder={language === "vi" ? "Ví dụ: SE19xxxx" : "e.g. SE19xxxx"}
                    value={mssv}
                    onChange={(e) => setMssv(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              )}
              {role === "LECTURER" && (
                <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70 pl-0.5">
                  {language === "vi" ? "ℹ️ Tài khoản giảng viên sẽ chờ Admin xác nhận trước khi kích hoạt." : "ℹ️ Lecturer accounts will await Admin approval before activation."}
                </p>
              )}

              {/* Form error */}
              {formError && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-1">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 text-sm font-bold text-white bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all"
                >
                  {submitting ? (language === "vi" ? "Đang xử lý…" : "Processing...") : t("oauth.submit_btn")}
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full py-3.5 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all"
                >
                  {t("auth.back_to_login")}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
