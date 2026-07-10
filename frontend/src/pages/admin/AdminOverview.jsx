import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/config/api.js";
import { Users, BookOpen, HardDrive, GraduationCap, Mic2, ClipboardList, TrendingUp, Eye, Download } from "lucide-react";
import AdminAnalyticsCharts from "./AdminAnalyticsCharts";
import { useLanguage } from "../../context/LanguageContext";

// BR-AM-08: Dashboard phải hiển thị tổng user, tài liệu, storage
export default function AdminOverview() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [popularDocs, setPopularDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback mock khi backend chưa ready
        setStats({
          totalStudents:  0,
          totalLecturers: 0,
          totalDocuments: 0,
          totalStorageUsed: 0,
          totalStorageLimit: 10,
        });
        setLoading(false);
      });
  }, []);

  const storagePercent = stats
    ? Math.min(Math.round((stats.totalStorageUsed / stats.totalStorageLimit) * 100), 100)
    : 0;

  const statCards = [
    {
      key: "students",
      label: language === "vi" ? "Sinh viên" : "Student",
      value: stats?.totalStudents ?? 0,
      icon: GraduationCap,
      accent: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
      top: "bg-purple-500",
    },
    {
      key: "lecturers",
      label: language === "vi" ? "Giảng viên" : "Lecturer",
      value: stats?.totalLecturers ?? 0,
      icon: Mic2,
      accent: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      top: "bg-blue-500",
    },
    {
      key: "documents",
      label: language === "vi" ? "Tài liệu" : "Document",
      value: stats?.totalDocuments ?? 0,
      icon: BookOpen,
      accent: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      top: "bg-violet-500",
    },
    {
      key: "storage",
      label: language === "vi" ? "Dung lượng" : "Storage",
      value: null, // custom render
      icon: HardDrive,
      accent: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      top: "bg-amber-500",
    },
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">{language === "vi" ? "Trang Tổng Quan" : "Overview"}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">{language === "vi" ? "Thống kê và giám sát toàn hệ thống" : "System statistics and monitoring"}</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold tracking-widest uppercase border border-purple-200">
          Admin Dashboard
        </span>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ key, label, value, icon: Icon, accent, bg, border, top }) => {
          const isStorage = key === "storage";
          const isStudents = key === "students";
          const isLecturers = key === "lecturers";
          const isClickable = isStorage || isStudents || isLecturers;

          const handleClick = () => {
            if (isStorage) navigate("/admin/storage");
            if (isStudents) navigate("/admin/users?role=STUDENT");
            if (isLecturers) navigate("/admin/users?role=LECTURER");
          };

          return (
            <div
              key={key}
              onClick={handleClick}
              className={`bg-white rounded-xl border ${border} shadow-sm relative overflow-hidden
                hover:shadow-md transition-shadow duration-200 group ${isClickable ? "cursor-pointer" : ""}`}
            >
              {/* Top accent bar */}
              <div className={`h-[3px] ${top} w-full`} />

              <div className="p-5">
                {isStorage ? (
                /* Storage card — custom layout */
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                      {loading ? (
                        <div className="h-6 w-20 bg-slate-100 rounded animate-pulse" />
                      ) : (
                        <p className="text-[17px] font-extrabold text-slate-700 leading-none">
                          {stats.totalStorageUsed} <span className="text-[13px] font-semibold text-slate-400">/ {stats.totalStorageLimit} GB</span>
                        </p>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={accent} />
                    </div>
                  </div>
                  {/* Storage bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        storagePercent > 80 ? "bg-red-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">{storagePercent}% {language === "vi" ? "đã sử dụng" : "used"}</p>
                </div>
              ) : (
                /* Standard stat card */
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                    {loading ? (
                      <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
                    ) : (
                      <p className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                        {value.toLocaleString("vi-VN")}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                      {key === "students" && (language === "vi" ? "Đã đăng ký · đang hoạt động" : "Registered · active")}
                      {key === "lecturers" && (language === "vi" ? "Đã đăng ký · đang hoạt động" : "Registered · active")}
                      {key === "documents" && (language === "vi" ? "Tổng tài liệu trong hệ thống" : "Total documents in system")}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={accent} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>

      {/* ── Analytics Charts ── */}
      <AdminAnalyticsCharts />
    </div>
  );
}
