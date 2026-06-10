import { useState, useEffect } from "react";
import { Search, Lock, Unlock, Users } from "lucide-react";
import Pagination from "../../components/Pagination";

// BR-AM-03 / 04 / 05 / 06
const PAGE_SIZE = 10;

const formatSize = (bytes) => {
  const sizeNum = Number(bytes);
  if (isNaN(sizeNum) || sizeNum <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(sizeNum) / Math.log(k));
  return parseFloat((sizeNum / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const ROLE_BADGE = {
  STUDENT: "bg-purple-100 text-purple-700 border-purple-200",
  LECTURER: "bg-blue-100 text-blue-700 border-blue-200",
  ADMIN: "bg-amber-100 text-amber-700 border-amber-200",
};

const ROLE_LABEL = { STUDENT: "Sinh viên", LECTURER: "Giảng viên", ADMIN: "Admin" };

export default function AdminUserManagement({ roleFilter = "all" }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast]     = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const meStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const me = meStr ? JSON.parse(meStr) : null;

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5000/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setUsers([]); setLoading(false); });
  }, []);

  // Reset page khi đổi filter/search
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLock = async (user) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user.id}/lock`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showToast("error", data.error || "Không thể khóa tài khoản");
        setConfirm(null);
        return;
      }
      setUsers(p => p.map(u => u.id === user.id ? { ...u, status: "LOCKED" } : u));
      showToast("success", `Đã khóa tài khoản ${user.email}`);
    } catch (error) {
      showToast("error", "Lỗi kết nối đến máy chủ");
    }
    setConfirm(null);
  };

  const handleUnlock = async (user) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user.id}/unlock`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showToast("error", data.error || "Không thể mở khóa tài khoản");
        setConfirm(null);
        return;
      }
      setUsers(p => p.map(u => u.id === user.id ? { ...u, status: "ACTIVE" } : u));
      showToast("success", `Đã mở khóa tài khoản ${user.email}`);
    } catch (error) {
      showToast("error", "Lỗi kết nối đến máy chủ");
    }
    setConfirm(null);
  };

  // Filter
  const filtered = users.filter(u => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      String(u.id).includes(q);
    return matchRole && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageTitle = roleFilter === "STUDENT" ? "Quản lý Sinh viên"
    : roleFilter === "LECTURER" ? "Quản lý Giảng viên"
      : "Quản lý Người dùng";

  const tableSubtitle = roleFilter === "STUDENT" ? "Sinh viên"
    : roleFilter === "LECTURER" ? "Giảng viên"
      : "Tất cả người dùng";

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">{pageTitle}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">{filtered.length} kết quả</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold tracking-widest uppercase border border-purple-200">
          {tableSubtitle}
        </span>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-gray-200">
          <span className="text-[13.5px] font-bold text-slate-700">{tableSubtitle}</span>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="adm-user-search"
              type="text"
              className="pl-8 pr-3 py-1.5 text-[12.5px] border border-gray-200 rounded-lg bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 w-52 font-medium"
              placeholder="Tìm theo tên, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-[13px] text-purple-400 font-semibold animate-pulse">
            Đang tải dữ liệu...
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-[13px] text-slate-400 font-semibold">Không tìm thấy người dùng</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["ID", "Họ tên", "Email", "Vai trò", "Đã sử dụng", "Trạng thái", "Thao tác"].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-gray-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(user => {
                const isMe = me && (String(user.id) === String(me.user_id) || user.email === me.email);
                const isLocked = user.status === "LOCKED";
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-mono text-slate-400">{user.id}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-700">{user.full_name}</td>
                    <td className="px-5 py-3 text-[12.5px] text-slate-500">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border ${ROLE_BADGE[user.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {user.role === "ADMIN" ? (
                        <span className="text-slate-400 text-[12px] font-semibold italic">Không khả dụng</span>
                      ) : (() => {
                        const usedGB = Number(user.used_storage) / (1024 ** 3);
                        const limitGB = Number(user.max_storage_bytes || 2147483648) / (1024 ** 3);
                        const percent = Math.min((usedGB / limitGB) * 100, 100);
                        return (
                          <div className="flex flex-col gap-1 w-28">
                            <div className="text-[11.5px] text-slate-500 font-medium">
                              <span className="font-semibold text-slate-700 font-mono">{usedGB.toFixed(3)}</span>
                              <span className="text-slate-400"> / {limitGB.toFixed(0)} GB</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                              <div
                                className={`h-full rounded-full transition-all duration-300
                                  ${percent > 90 ? "bg-red-500" : percent > 70 ? "bg-amber-500" : "bg-purple-500"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold
                        ${isLocked ? "bg-red-50 text-red-600 border border-red-200"
                          : user.status === "PENDING" ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-green-50 text-green-700 border border-green-200"}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {isLocked ? "Đã khóa" : user.status === "PENDING" ? "Chờ duyệt" : "Hoạt động"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {isLocked ? (
                          <button
                            id={`adm-unlock-${user.id}`}
                            onClick={() => setConfirm({ action: "unlock", user })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <Unlock size={10} /> Mở khóa
                          </button>
                        ) : user.status === "PENDING" ? (
                          <button
                            id={`adm-approve-${user.id}`}
                            onClick={() => setConfirm({ action: "approve", user })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                          >
                            <Unlock size={10} /> Duyệt tài khoản
                          </button>
                        ) : (
                          <button
                            id={`adm-lock-${user.id}`}
                            disabled={isMe}
                            title={isMe ? "Không thể khóa chính mình" : ""}
                            onClick={() => !isMe && setConfirm({ action: "lock", user })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Lock size={10} /> Khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border-t border-gray-200">
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl p-7 w-[420px] shadow-2xl border border-gray-200"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-extrabold !text-slate-800 mb-2">
              {confirm.action === "lock" && "Khóa tài khoản"}
              {confirm.action === "unlock" && "Mở khóa tài khoản"}
              {confirm.action === "approve" && "Duyệt tài khoản"}
            </h2>
            <p className="text-[13.5px] text-slate-500 leading-relaxed mb-6">
              {confirm.action === "lock" &&
                <>Bạn có chắc muốn <strong>khóa</strong> tài khoản <strong>{confirm.user.email}</strong>? Người dùng sẽ không thể đăng nhập.</>}
              {confirm.action === "unlock" &&
                <>Mở khóa tài khoản <strong>{confirm.user.email}</strong> để cho phép đăng nhập trở lại?</>}
              {confirm.action === "approve" &&
                <>Duyệt hoạt động tài khoản giảng viên <strong>{confirm.user.email}</strong>?</>}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Hủy
              </button>
              <button
                id="adm-confirm-action-btn"
                onClick={() => {
                  if (confirm.action === "lock") handleLock(confirm.user);
                  if (confirm.action === "unlock" || confirm.action === "approve") handleUnlock(confirm.user);
                }}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90
                  ${confirm.action === "lock" ? "bg-red-600" : "bg-purple-600"}`}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
