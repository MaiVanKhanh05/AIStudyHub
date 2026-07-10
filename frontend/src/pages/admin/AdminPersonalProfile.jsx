import { useState } from "react";
import { User as UserIcon, Mail, Shield, Key, Globe, Camera, UploadCloud, Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminPersonalProfile() {
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [toast, setToast] = useState(null);
  const [savingPw, setSavingPw] = useState(false);
  const { language, setLanguage } = useLanguage();

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const showToast = (type, msg) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      showToast("error", "Mật khẩu xác nhận không khớp.");
      return;
    }
    setSavingPw(true);
    try {
      const r = await fetch("http://localhost:5000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error || "Mật khẩu hiện tại không chính xác.");
      }
      showToast("success", "Đổi mật khẩu thành công!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      showToast("error", err.message || "Không thể đổi mật khẩu. Vui lòng kiểm tra lại.");
    } finally {
      setSavingPw(false);
    }
  };

  const initials = user.full_name
    ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "AD";
  const fullName = user.full_name || (language === "vi" ? "Quản trị viên" : "Administrator");

  return (
    <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up text-left">
      <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{language === "vi" ? "Định danh tài khoản" : "Account Identity"}</span>
        <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
          {language === "vi" ? "Hồ Sơ Quản Trị Viên" : "Administrator Profile"}
        </h1>
        <span className="text-xs text-slate-500 font-medium mt-1">
          {language === "vi" ? "Quản lý thông tin bảo mật và phân quyền hệ thống tối cao." : "Manage security info and supreme system permissions."}
        </span>
      </header>

      {/* 1. Header Banner Card */}
      <div className="bg-white/50 dark:bg-[#0f111a]/50 rounded-3xl overflow-hidden shadow-sm border-0 relative">
        <div className="w-full h-32 md:h-40 bg-gradient-to-r from-purple-100/60 via-purple-50/60 to-white dark:from-purple-900/40 dark:via-purple-800/30 dark:to-[#0f111a] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-200/50 via-transparent to-transparent dark:from-purple-800/50" />
        </div>
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              <div className="relative z-10 shrink-0 w-28 h-28 md:w-32 md:h-32 -mt-16">
                <div className="w-full h-full rounded-full bg-purple-600 flex flex-col items-center justify-center font-bold text-white text-4xl shadow-md overflow-hidden transition-all duration-300 border-[6px] border-white dark:border-[#0f111a] relative">
                  <span>{initials}</span>
                </div>
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 z-20 pointer-events-none">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex flex-col pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{fullName}</span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded font-black uppercase tracking-widest">{user.role || "ADMIN"}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {user.user_id || user.id || "ADMIN_ID"}</span>
                  <div className="w-[1.5px] h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <span className="flex items-center gap-1.5 truncate max-w-[150px] md:max-w-none"><Mail className="w-3.5 h-3.5" /> {user.email || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personal & Academic Info Card */}
      <div className="bg-white dark:bg-[#0c0d13] rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm relative overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center z-10 relative border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <h3 className="text-sm font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserIcon className="w-4 h-4 text-purple-500" /> {language === "vi" ? "Thông tin hệ thống" : "System Information"}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex flex-col w-full gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "vi" ? "Quyền hạn" : "Permission"}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{language === "vi" ? "Quản trị viên tối cao" : "Supreme Administrator"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
              <Globe className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex flex-col w-full gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === "vi" ? "Ngôn ngữ hiển thị" : "Display Language"}</span>
              <div className="flex p-0.5 bg-purple-50 dark:bg-slate-800/80 rounded-full mt-1 border border-purple-100 dark:border-slate-700 w-max">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("vi");
                    localStorage.setItem("admin_lang", "vi");
                  }}
                  className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${language === "vi" ? "bg-purple-600 text-white shadow-sm" : "text-purple-600/60 dark:text-slate-400 hover:text-purple-700 dark:hover:text-slate-300"}`}
                >
                  VI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("en");
                    localStorage.setItem("admin_lang", "en");
                  }}
                  className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${language === "en" ? "bg-purple-600 text-white shadow-sm" : "text-purple-600/60 dark:text-slate-400 hover:text-purple-700 dark:hover:text-slate-300"}`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Password Form Card */}
      <div className="bg-white dark:bg-[#0c0d13] rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <h3 className="text-sm font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-purple-500" /> {language === "vi" ? "Đổi mật khẩu bảo mật" : "Change Security Password"}
          </h3>
        </div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === "vi" ? "Mật khẩu hiện tại" : "Current Password"}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
                required
                disabled={savingPw}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === "vi" ? "Mật khẩu mới" : "New Password"}</label>
              <input
                type="password"
                placeholder={language === "vi" ? "Tối thiểu 6 ký tự" : "Minimum 6 characters"}
                value={pwForm.next}
                onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
                required minLength={6}
                disabled={savingPw}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === "vi" ? "Xác nhận mật khẩu" : "Confirm Password"}</label>
              <input
                type="password"
                placeholder={language === "vi" ? "Nhập lại để xác nhận" : "Enter again to confirm"}
                value={pwForm.confirm}
                onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
                disabled={savingPw}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          {pwForm.confirm && pwForm.next !== pwForm.confirm && (
            <div className="flex items-start gap-2.5 text-xs text-red-650 bg-red-50 border border-red-200 rounded-xl p-3.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-555" />
              <span className="font-bold text-red-600">{language === "vi" ? "Mật khẩu mới không khớp!" : "New password does not match!"}</span>
            </div>
          )}
          <div className="flex justify-start mt-2">
            <button
              type="submit"
              disabled={savingPw}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wider px-8 py-4 rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              {savingPw ? (language === "vi" ? "Đang cập nhật..." : "Updating...") : (language === "vi" ? "Cập nhật mật khẩu" : "Update password")}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-semibold text-white shadow-xl z-50 animate-in slide-in-from-bottom-3 ${toast.type === "success" ? "bg-slate-800 border-l-4 border-green-400" : toast.type === "error" ? "bg-slate-800 border-l-4 border-red-400" : "bg-slate-800 border-l-4 border-purple-400"}`}>
          <span>{toast.type === "success" ? <CheckCircle size={16}/> : toast.type === "error" ? <AlertTriangle size={16}/> : "ℹ"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
