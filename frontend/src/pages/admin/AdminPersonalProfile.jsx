import { useState } from "react";
import { API_URL } from "@/config/api.js";
import { User, Mail, Shield, Key, Globe } from "lucide-react";

export default function AdminPersonalProfile() {
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [toast, setToast] = useState(null);
  const [savingPw, setSavingPw] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("admin_lang") || "vi");

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
      const r = await fetch(`${API_URL}/api/auth/change-password`, {
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

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">Hồ Sơ Cá Nhân</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">Xem thông tin tài khoản và đổi mật khẩu bảo mật</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
        {/* Left Column: Read-Only Personal Profile Details */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center">
          {/* Avatar Area */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/10 mb-4 select-none">
            {initials}
          </div>

          {/* User Name */}
          <h2 className="text-[17px] font-extrabold !text-slate-800 text-center leading-tight">
            {user.full_name || "Quản trị viên"}
          </h2>

          {/* Role Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 mt-2 rounded-full text-[10.5px] font-bold border tracking-wider uppercase
            ${user.role === "ADMIN" ? "bg-amber-50 text-amber-700 border-amber-200"
              : user.role === "LECTURER" ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-purple-50 text-purple-700 border-purple-200"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {user.role || "ADMIN"}
          </span>

          <div className="w-full h-px bg-slate-100 my-6" />

          {/* Details Lists (Read-Only) */}
          <div className="w-full space-y-4">
            {/* User ID / Account Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mã tài khoản (ID)</label>
              <div className="flex items-center px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[12.5px] text-slate-600 font-semibold font-mono select-all">
                {user.user_id || user.id || "N/A"}
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Địa chỉ Email</label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[12.5px] text-slate-600 font-semibold">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{user.email || "N/A"}</span>
              </div>
            </div>

            {/* System Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vai trò hệ thống</label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[12.5px] text-slate-600 font-semibold">
                <Shield size={13} className="text-slate-400 shrink-0" />
                <span>{user.role === "ADMIN" ? "Quản trị viên tối cao" : user.role === "LECTURER" ? "Giảng viên trường" : "Sinh viên trường"}</span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ngôn ngữ hiển thị (Language)</label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => {
                    const lang = e.target.value;
                    setLanguage(lang);
                    localStorage.setItem("admin_lang", lang);
                    showToast("success", `Đã chuyển ngôn ngữ sang ${lang === "vi" ? "Tiếng Việt" : "English"}`);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200/50 text-[12.5px] text-slate-600 font-semibold outline-none focus:border-purple-400 cursor-pointer appearance-none"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 English</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <Globe size={13} />
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[10px] text-slate-400">
                  ▼
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Key size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-extrabold !text-slate-800 leading-none mb-1">Đổi mật khẩu</h2>
              <p className="text-[11.5px] text-slate-400 font-medium">Giữ cho tài khoản của bạn luôn được bảo mật</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="adm-pw-current">
                Mật khẩu hiện tại
              </label>
              <input
                id="adm-pw-current"
                type="password"
                className="px-4 py-2.5 text-[13px] border border-gray-200 rounded-xl bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all font-semibold placeholder:text-slate-300"
                placeholder="Nhập mật khẩu hiện tại"
                value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                required
              />
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="adm-pw-new">
                Mật khẩu mới
              </label>
              <input
                id="adm-pw-new"
                type="password"
                className="px-4 py-2.5 text-[13px] border border-gray-200 rounded-xl bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all font-semibold placeholder:text-slate-300"
                placeholder="Tối thiểu 6 ký tự"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="adm-pw-confirm">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="adm-pw-confirm"
                type="password"
                className="px-4 py-2.5 text-[13px] border border-gray-200 rounded-xl bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all font-semibold placeholder:text-slate-300"
                placeholder="Nhập lại mật khẩu mới"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>

            {pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <div className="text-[12px] text-red-600 font-bold mt-1">
                Mật khẩu mới không khớp!
              </div>
            )}

            {/* Submit Button */}
            <button
              id="adm-change-pw-btn"
              type="submit"
              className="w-full py-3.5 text-[13.5px] font-bold text-white bg-gradient-to-r from-purple-500 to-purple-800 hover:from-purple-600 hover:to-purple-900 shadow-lg shadow-purple-500/20 active:translate-y-px rounded-xl transition-all select-none mt-2"
              disabled={savingPw}
            >
              {savingPw ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        </div>
      </div>

      {/* Purple Notification Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-semibold text-white shadow-xl z-50 animate-in slide-in-from-bottom-3
          ${toast.type === "success" ? "bg-slate-800 border-l-4 border-green-400"
            : toast.type === "error" ? "bg-slate-800 border-l-4 border-red-400"
              : "bg-slate-800 border-l-4 border-purple-400"}`}>
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
