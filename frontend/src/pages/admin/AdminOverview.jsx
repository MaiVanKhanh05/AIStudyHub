import { useState, useEffect } from "react";
import { Users, BookOpen, HardDrive, GraduationCap, Mic2, ClipboardList, TrendingUp, Eye, Download } from "lucide-react";
import AdminSystemLog from "./AdminSystemLog";

// BR-AM-08: Dashboard phải hiển thị tổng user, tài liệu, storage
export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [popularDocs, setPopularDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch("http://localhost:5000/api/admin/stats", {
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

    // Lấy top 10 tài liệu
    fetch("http://localhost:5000/api/admin/popular-documents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPopularDocs(data);
        setLoadingDocs(false);
      })
      .catch(() => setLoadingDocs(false));

  }, []);

  const storagePercent = stats
    ? Math.min(Math.round((stats.totalStorageUsed / stats.totalStorageLimit) * 100), 100)
    : 0;

  const statCards = [
    {
      key: "students",
      label: "Sinh viên",
      value: stats?.totalStudents ?? 0,
      icon: GraduationCap,
      accent: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
      top: "bg-purple-500",
    },
    {
      key: "lecturers",
      label: "Giảng viên",
      value: stats?.totalLecturers ?? 0,
      icon: Mic2,
      accent: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      top: "bg-blue-500",
    },
    {
      key: "documents",
      label: "Tài liệu",
      value: stats?.totalDocuments ?? 0,
      icon: BookOpen,
      accent: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      top: "bg-violet-500",
    },
    {
      key: "storage",
      label: "Dung lượng",
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
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">Trang Tổng Quan</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">Thống kê và giám sát toàn hệ thống</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold tracking-widest uppercase border border-purple-200">
          Admin Dashboard
        </span>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ key, label, value, icon: Icon, accent, bg, border, top }) => (
          <div
            key={key}
            className={`bg-white rounded-xl border ${border} shadow-sm relative overflow-hidden
              hover:shadow-md transition-shadow duration-200 group`}
          >
            {/* Top accent bar */}
            <div className={`h-[3px] ${top} w-full`} />

            <div className="p-5">
              {key === "storage" ? (
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
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">{storagePercent}% đã sử dụng</p>
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
                      {key === "students" && "Đã đăng ký · đang hoạt động"}
                      {key === "lecturers" && "Đã đăng ký · đang hoạt động"}
                      {key === "documents" && "Tổng tài liệu trong hệ thống"}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={accent} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Top 10 Tài Liệu Nổi Bật ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 bg-slate-50">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Top 10 Tài Liệu Được Quan Tâm Nhất</h2>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Dựa trên tổng lượt xem và lượt tải xuống trong cộng đồng</p>
          </div>
        </div>
        
        {loadingDocs ? (
          <div className="py-12 text-center text-[13px] text-slate-400 font-semibold animate-pulse">
            Đang tải dữ liệu...
          </div>
        ) : popularDocs.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-[13px] text-slate-400 font-semibold">Chưa có tài liệu nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-gray-200 w-12 text-center">#</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-gray-200">Tên tài liệu</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-gray-200">Môn học</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-gray-200">Người đăng</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-gray-200">Lượt tương tác</th>
                </tr>
              </thead>
              <tbody>
                {popularDocs.map((doc, index) => (
                  <tr key={doc.document_id} className="hover:bg-slate-50/70 transition-colors border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3.5 text-[13px] font-black text-slate-400 text-center">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13.5px] font-semibold text-slate-700 line-clamp-1" title={doc.title}>{doc.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {doc.subject_code || "Khác"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-slate-500 font-medium">
                      {doc.uploader}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-3 text-[12.5px] font-semibold">
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          <Eye size={13} /> {doc.views || 0}
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <Download size={13} /> {doc.downloads || 0}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── System Log ── */}
      <AdminSystemLog />
    </div>
  );
}
