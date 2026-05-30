import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";

const MOCK_LOGS = [
  { id: 1, action: "LOCK_ACCOUNT",    adminEmail: "admin@aistudyhub.vn", target: "user101@gmail.com",        at: "30/05/2026 14:22" },
  { id: 2, action: "APPROVE_DOCUMENT",adminEmail: "admin@aistudyhub.vn", target: "Giáo trình Toán Cao Cấp", at: "30/05/2026 13:55" },
  { id: 3, action: "RESET_PASSWORD",  adminEmail: "admin@aistudyhub.vn", target: "user103@gmail.com",        at: "30/05/2026 11:10" },
  { id: 4, action: "UNLOCK_ACCOUNT",  adminEmail: "admin@aistudyhub.vn", target: "user105@gmail.com",        at: "29/05/2026 09:48" },
  { id: 5, action: "DELETE_DOCUMENT", adminEmail: "admin@aistudyhub.vn", target: "bai_tap_sql.pdf",          at: "29/05/2026 08:30" },
  { id: 6, action: "APPROVE_DOCUMENT",adminEmail: "admin@aistudyhub.vn", target: "slide_oop_2026.pptx",     at: "28/05/2026 16:00" },
];

const LOG_META = {
  LOCK_ACCOUNT:     { dot: "bg-red-500",    label: "Khóa tài khoản" },
  UNLOCK_ACCOUNT:   { dot: "bg-green-500",  label: "Mở khóa tài khoản" },
  RESET_PASSWORD:   { dot: "bg-purple-500", label: "Reset mật khẩu" },
  APPROVE_DOCUMENT: { dot: "bg-blue-500",   label: "Duyệt tài liệu" },
  DELETE_DOCUMENT:  { dot: "bg-amber-500",  label: "Xóa tài liệu" },
  REJECT_DOCUMENT:  { dot: "bg-orange-500", label: "Từ chối tài liệu" },
};

export default function AdminSystemLog() {
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/logs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data.slice(0, 10) : MOCK_LOGS); setLoading(false); })
      .catch(() => { setLogs(MOCK_LOGS); setLoading(false); });
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-purple-500" />
          <span className="text-[13.5px] font-bold text-slate-700">Nhật ký hệ thống</span>
        </div>
        <span className="text-[11.5px] text-slate-400 font-medium">Nhật ký hoạt động gần đây</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[13px] text-purple-400 font-semibold animate-pulse">
          Đang tải...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[13px] text-slate-400 font-semibold">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map(log => {
            const meta = LOG_META[log.action] || { dot: "bg-slate-400", label: log.action };
            return (
              <div key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className={`w-2 h-2 rounded-full ${meta.dot} shrink-0 mt-[5px]`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-700">
                    {meta.label}{" "}
                    <span className="text-slate-400 font-medium">→ {log.target}</span>
                  </div>
                  <div className="text-[11.5px] text-slate-400 mt-0.5">
                    Bởi {log.adminEmail} · {log.at}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
