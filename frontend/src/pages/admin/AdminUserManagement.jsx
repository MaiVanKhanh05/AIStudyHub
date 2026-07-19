import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "@/config/api.js";
import { Search, Lock, Unlock, Users, ChevronDown } from "lucide-react";
import Pagination from "../../components/Pagination";
import { useLanguage } from "../../context/LanguageContext";

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

export default function AdminUserManagement() {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFilter = searchParams.get("role") || "all";
  const [localRoleFilter, setLocalRoleFilter] = useState(roleFilter);
  const statusFilter = searchParams.get("status") || "all";
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast]     = useState(null);

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setLocalRoleFilter(searchParams.get("role") || "all");
    setLocalStatusFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const ROLE_LABEL = { STUDENT: language === "vi" ? "Sinh viên" : "Student", LECTURER: language === "vi" ? "Giảng viên" : "Lecturer", ADMIN: "Admin" };

  const roleOptions = [
    { value: "all", label: language === "vi" ? "Tất cả vai trò" : "All roles" },
    { value: "STUDENT", label: language === "vi" ? "Sinh viên" : "Student" },
    { value: "LECTURER", label: language === "vi" ? "Giảng viên" : "Lecturer" },
    { value: "ADMIN", label: "Admin" },
  ];
  const selectedRole = roleOptions.find(r => r.value === localRoleFilter) || roleOptions[0];

  const statusOptions = [
    { value: "all", label: language === "vi" ? "Tất cả trạng thái" : "All status" },
    { value: "ACTIVE", label: language === "vi" ? "Hoạt động" : "Active" },
    { value: "LOCKED", label: language === "vi" ? "Đã khóa" : "Locked" },
    { value: "PENDING", label: language === "vi" ? "Chờ duyệt" : "Pending" },
  ];
  const selectedStatus = statusOptions.find(r => r.value === localStatusFilter) || statusOptions[0];

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const meStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const me = meStr ? JSON.parse(meStr) : null;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/users?page=${page}&limit=${PAGE_SIZE}&role=${localRoleFilter}&status=${localStatusFilter}&search=${encodeURIComponent(debouncedSearch)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { 
        if (data && data.users) {
          setUsers(data.users); 
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.totalCount || 0);
        } else {
          setUsers(Array.isArray(data) ? data : []); 
          setTotalPages(1);
          setTotalCount(Array.isArray(data) ? data.length : 0);
        }
        setLoading(false); 
      })
      .catch(() => { setUsers([]); setLoading(false); });
  }, [page, localRoleFilter, localStatusFilter, debouncedSearch, token]);

  // Reset page khi đổi filter/search
  useEffect(() => { setPage(1); }, [debouncedSearch, localRoleFilter, localStatusFilter]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLock = async (user) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}/lock`, {
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
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}/unlock`, {
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

  const handleApprove = async (user) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        showToast("error", data.error || "Không thể duyệt tài khoản");
        setConfirm(null);
        return;
      }
      setUsers(p => p.map(u => u.id === user.id ? { ...u, status: "ACTIVE" } : u));
      showToast("success", `Đã duyệt tài khoản ${user.email}`);
    } catch (error) {
      showToast("error", "Lỗi kết nối đến máy chủ");
    }
    setConfirm(null);
  };

  const pageTitle = language === "vi" ? "Quản lý Người dùng" : "User Management";

  const tableSubtitle = localRoleFilter === "STUDENT" ? (language === "vi" ? "Sinh viên" : "Student")
    : localRoleFilter === "LECTURER" ? (language === "vi" ? "Giảng viên" : "Lecturer")
    : localRoleFilter === "ADMIN" ? "Admin"
    : (language === "vi" ? "Tất cả người dùng" : "All users");

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">{pageTitle}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">{totalCount} {language === "vi" ? "kết quả" : "results"}</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold tracking-widest uppercase border border-purple-200">
          {tableSubtitle}
        </span>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-gray-200">
          <span className="text-[13.5px] font-bold text-slate-700">{tableSubtitle}</span>
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center justify-between gap-3 px-3.5 py-1.5 text-[12.5px] border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-100 min-w-[150px] font-medium text-slate-700 transition-all shadow-sm cursor-pointer"
              >
                <span className="truncate">{selectedRole.label}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {isRoleDropdownOpen && (
                <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-gray-100 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 origin-top overflow-hidden">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLocalRoleFilter(opt.value);
                        setSearchParams(prev => { prev.set("role", opt.value); return prev; });
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer
                        ${localRoleFilter === opt.value ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center justify-between gap-3 px-3.5 py-1.5 text-[12.5px] border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-100 min-w-[150px] font-medium text-slate-700 transition-all shadow-sm cursor-pointer"
              >
                <span className="truncate">{selectedStatus.label}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-gray-100 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 origin-top overflow-hidden">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLocalStatusFilter(opt.value);
                        setSearchParams(prev => { prev.set("status", opt.value); return prev; });
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer
                        ${localStatusFilter === opt.value ? "bg-purple-50 text-purple-700 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="adm-user-search"
                type="text"
                className="pl-8 pr-3 py-1.5 text-[12.5px] border border-gray-200 rounded-lg bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 w-52 font-medium"
                placeholder={language === "vi" ? "Tìm theo tên, email..." : "Search by name, email..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {(language === "vi" ? ["ID", "Họ tên", "Email", "Vai trò", "Đã sử dụng", "Trạng thái", "Thao tác"] : ["ID", "Full Name", "Email", "Role", "Used", "Status", "Actions"]).map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100 last:border-0">
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-8"></div></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded-full w-20"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded w-28"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded-full w-20"></div></td>
                  <td className="px-5 py-4"><div className="flex gap-2"><div className="h-6 bg-slate-100 rounded w-16"></div></div></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center">
                  <Users size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-[13px] text-slate-400 font-semibold">{language === "vi" ? "Không tìm thấy người dùng" : "No users found"}</p>
                </td>
              </tr>
            ) : (
              users.map(user => {
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
                        <span className="text-slate-400 text-[12px] font-semibold italic">{language === "vi" ? "Không khả dụng" : "N/A"}</span>
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
                        {isLocked ? (language === "vi" ? "Đã khóa" : "Locked") : user.status === "PENDING" ? (language === "vi" ? "Chờ duyệt" : "Pending") : (language === "vi" ? "Hoạt động" : "Active")}
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
                            <Unlock size={10} /> {language === "vi" ? "Mở khóa" : "Unlock"}
                          </button>
                        ) : user.status === "PENDING" ? (
                          <button
                            id={`adm-approve-${user.id}`}
                            onClick={() => setConfirm({ action: "approve", user })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                          >
                            <Unlock size={10} /> {language === "vi" ? "Duyệt tài khoản" : "Approve"}
                          </button>
                        ) : (
                          <button
                            id={`adm-lock-${user.id}`}
                            disabled={isMe}
                            title={isMe ? "Không thể khóa chính mình" : ""}
                            onClick={() => !isMe && setConfirm({ action: "lock", user })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Lock size={10} /> {language === "vi" ? "Khóa" : "Lock"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
              {confirm.action === "lock" && (language === "vi" ? "Khóa tài khoản" : "Lock Account")}
              {confirm.action === "unlock" && (language === "vi" ? "Mở khóa tài khoản" : "Unlock Account")}
              {confirm.action === "approve" && (language === "vi" ? "Duyệt tài khoản" : "Approve Account")}
            </h2>
            <p className="text-[13.5px] text-slate-500 leading-relaxed mb-6">
              {confirm.action === "lock" &&
                <>{language === "vi" ? "Bạn có chắc muốn" : "Are you sure you want to"} <strong>{language === "vi" ? "khóa" : "lock"}</strong> {language === "vi" ? "tài khoản" : "account"} <strong>{confirm.user.email}</strong>? {language === "vi" ? "Người dùng sẽ không thể đăng nhập." : "The user will not be able to log in."}</>}
              {confirm.action === "unlock" &&
                <>{language === "vi" ? "Mở khóa tài khoản" : "Unlock account"} <strong>{confirm.user.email}</strong> {language === "vi" ? "để cho phép đăng nhập trở lại?" : "to allow logging in again?"}</>}
              {confirm.action === "approve" &&
                <>{language === "vi" ? "Duyệt hoạt động tài khoản giảng viên" : "Approve lecturer account"} <strong>{confirm.user.email}</strong>?</>}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                {language === "vi" ? "Hủy" : "Cancel"}
              </button>
              <button
                id="adm-confirm-action-btn"
                onClick={() => {
                  if (confirm.action === "lock") handleLock(confirm.user);
                  if (confirm.action === "unlock") handleUnlock(confirm.user);
                  if (confirm.action === "approve") handleApprove(confirm.user);
                }}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90
                  ${confirm.action === "lock" ? "bg-red-600" : "bg-purple-600"}`}>
                {language === "vi" ? "Xác nhận" : "Confirm"}
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
