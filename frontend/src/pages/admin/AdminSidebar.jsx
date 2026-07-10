import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, HardDrive, UserCog, User, Folder,
  Settings, LogOut, GraduationCap, Mic2, BookOpen, ShieldCheck, Globe
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

// NAV_SECTIONS is now defined dynamically inside the component to support active language switching

export default function AdminSidebar({ activeSection, onNavigate }) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  const navSections = [
    {
      label: language === "vi" ? "Quản trị" : "Administration",
      items: [
        { key: "dashboard", label: t("admin.sidebar.overview") || "Overview",          icon: LayoutDashboard },
        { key: "users",     label: t("admin.sidebar.users") || "User Management",  icon: UserCog },
      ],
    },
    {
      label: language === "vi" ? "Nội dung" : "Content",
      items: [
        { key: "topics",    label: language === "vi" ? "Chủ đề (Topics)" : "Topics", icon: Folder },        { key: "storage",   label: t("admin.sidebar.storage") || "Storage Management",    icon: HardDrive },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className="w-56 min-h-screen bg-[#1a0d2e] flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0 shadow-xl z-10">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center shrink-0">
          <BookOpen size={15} className="text-white" />
        </div>
        <div>
          <div className="text-[13px] font-extrabold text-white tracking-wide uppercase">AIStudyHub</div>
          <div className="text-[10px] text-white/40 font-medium tracking-widest uppercase">Admin Portal</div>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-bold text-white truncate">{user?.full_name || user?.email || "Admin"}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <ShieldCheck size={9} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Admin</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 pb-2 space-y-4">
        {navSections.map(({ label, items }) => (
          <div key={label}>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.12em] px-2 mb-1">{label}</p>
            <div className="space-y-0.5">
              {items.map(({ key, label: lbl, icon: Icon }) => {
                const isActive = activeSection === key;
                return (
                  <button
                    key={key}
                    id={`adm-nav-${key}`}
                    onClick={() => onNavigate(key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left
                      ${isActive
                        ? "bg-purple-500/25 text-white font-bold border-l-[3px] border-purple-400 pl-[9px]"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.07]"
                      }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span>{lbl}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-2">
        <div className="space-y-1.5">
          <button
            id="adm-nav-settings"
            onClick={() => setShowSettings(!showSettings)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left cursor-pointer
              ${showSettings ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/90 hover:bg-white/[0.07]"}`}
          >
            <Settings size={15} className="shrink-0" />
            <span>{language === "vi" ? "Cài đặt" : "Settings"}</span>
          </button>

          {/* Settings Dropdown Panel */}
          {showSettings && (
            <div className="mx-1 px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 select-none">
              {/* Mini User Profile Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-white text-[11px] font-black shrink-0 border border-white/10">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-white truncate leading-none mb-0.5">
                    {user?.full_name || (language === "vi" ? "Quản trị viên" : "Administrator")}
                  </div>
                  <div className="text-[10px] text-white/40 truncate leading-none mb-1">
                    {user?.email || "admin@aistudyhub.vn"}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{user?.role || "ADMIN"}</span>
                  </div>
                </div>
              </div>

              {/* Navigation button inside Settings Dropdown */}
              <button
                onClick={() => {
                  onNavigate("profile");
                  setShowSettings(false);
                }}
                className="w-full py-1.5 mt-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11.5px] font-bold text-center border border-white/5 transition-all cursor-pointer block"
              >
                {language === "vi" ? "Hồ sơ & Bảo mật" : "Profile & Security"}
              </button>

              <div className="h-px bg-white/10" />

              {/* Language Selector */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <Globe size={10} />
                  <span>{language === "vi" ? "Ngôn ngữ hiển thị" : "Display Language"}</span>
                </div>
                <div className="flex items-center mt-2">
                  <div className="flex p-0.5 bg-white/5 rounded-full border border-white/10 w-full">
                    <button
                      onClick={() => {
                        setLanguage("vi");
                        localStorage.setItem("admin_lang", "vi");
                      }}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all ${language === "vi" ? "bg-purple-600 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
                    >
                      VI
                    </button>
                    <button
                      onClick={() => {
                        setLanguage("en");
                        localStorage.setItem("admin_lang", "en");
                      }}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-full transition-all ${language === "en" ? "bg-purple-600 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          id="adm-nav-logout"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut size={15} className="shrink-0" />
          <span>{language === "vi" ? "Đăng xuất" : "Log out"}</span>
        </button>
      </div>
    </aside>
  );
}
