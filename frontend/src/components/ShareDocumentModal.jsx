import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Globe, Lock, Shield, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function ShareDocumentModal({ documentId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState("RESTRICTED");
  const [owner, setOwner] = useState(null);
  const [permissions, setPermissions] = useState([]);
  
  // Invite state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  
  const searchTimeoutRef = useRef(null);

  // Fetch share settings
  const fetchShareSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/documents/${documentId}/share`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVisibility(res.data.visibility);
      setOwner(res.data.owner);
      setPermissions(res.data.permissions || []);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải cài đặt chia sẻ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchShareSettings();
    }
  }, [documentId]);

  // Autocomplete search handler
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim() || selectedUser) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await axios.get(`http://localhost:5000/api/users/search?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out owner and already added users
        const filtered = res.data.filter(
          u => u.user_id !== owner?.user_id && !permissions.some(p => p.user_id === u.user_id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, owner, permissions, selectedUser]);

  // Add permission handler
  const handleAddPermission = async () => {
    if (!selectedUser) {
      toast.warning("Vui lòng chọn người dùng để mời!");
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/documents/${documentId}/share`,
        { userId: selectedUser.user_id, role: selectedRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Đã thêm quyền truy cập cho ${selectedUser.first_name}`);
      setSelectedUser(null);
      setSearchQuery("");
      fetchShareSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể thêm quyền chia sẻ.");
    } finally {
      setSubmitting(false);
    }
  };

  // Change role handler
  const handleChangeRole = async (targetUserId, newRole) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.patch(
        `http://localhost:5000/api/documents/${documentId}/share/${targetUserId}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Đã cập nhật vai trò!");
      fetchShareSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể cập nhật vai trò.");
    }
  };

  // Remove permission handler
  const handleRemovePermission = async (targetUserId) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/documents/${documentId}/share/${targetUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Đã xóa quyền truy cập!");
      fetchShareSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể xóa quyền.");
    }
  };

  // Visibility toggle handler
  const handleVisibilityChange = async (newVisibility) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.patch(
        `http://localhost:5000/api/documents/${documentId}/visibility`,
        { visibility: newVisibility },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVisibility(newVisibility);
      toast.success(`Đã đổi quyền truy cập thành ${newVisibility === "PUBLIC" ? "Công khai" : "Hạn chế"}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể cập nhật quyền truy cập chung.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col p-6 gap-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Cài đặt chia sẻ</h2>
              <p className="text-xs text-slate-500 font-medium">Quản lý quyền cộng tác trên tài liệu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
            <span className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải cài đặt chia sẻ...</span>
          </div>
        ) : (
          <>
            {/* Section 1: Invite User */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Mời người dùng
              </span>
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên, MSSV, hoặc Email..."
                    value={selectedUser ? `${selectedUser.last_name} ${selectedUser.first_name} (${selectedUser.email})` : searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedUser) setSelectedUser(null);
                    }}
                    disabled={submitting}
                    className="pl-9 pr-4 py-2 w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-white"
                  />
                  
                  {/* Search Results Autocomplete Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5">
                      {searchResults.map((user) => (
                        <button
                          key={user.user_id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <div className="w-6.5 h-6.5 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0 overflow-hidden text-[10px] font-extrabold text-purple-700 dark:text-purple-300">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              user.first_name.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                              {user.last_name} {user.first_name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none truncate">
                              {user.email} ({user.user_id})
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searching && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Role select */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={submitting}
                  className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 outline-none focus:ring-1 focus:ring-purple-500 dark:text-white cursor-pointer"
                >
                  <option value="VIEWER">Người xem</option>
                  <option value="EDITOR">Người chỉnh sửa</option>
                </select>

                <button
                  onClick={handleAddPermission}
                  disabled={submitting || !selectedUser}
                  className="h-9 px-4 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  Mời
                </button>
              </div>
            </div>

            {/* Section 2: General Access */}
            <div className="flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-3.5 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Quyền truy cập chung
              </span>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    {visibility === "PUBLIC" ? (
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-455" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {visibility === "PUBLIC" ? "Công khai" : "Hạn chế"}
                    </div>
                    <div className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mt-0.5">
                      {visibility === "PUBLIC"
                        ? "Bất kỳ người dùng nào đã đăng nhập đều có thể xem"
                        : "Chỉ những người dùng được mời mới có thể truy cập"}
                    </div>
                  </div>
                </div>

                <select
                  value={visibility}
                  onChange={(e) => handleVisibilityChange(e.target.value)}
                  className="h-8.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2 outline-none focus:ring-1 focus:ring-purple-500 dark:text-white cursor-pointer"
                >
                  <option value="RESTRICTED">Hạn chế</option>
                  <option value="PUBLIC">Công khai</option>
                </select>
              </div>
            </div>

            {/* Section 3: People With Access List */}
            <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Danh sách thành viên truy cập
              </span>
              <div className="flex flex-col gap-2">
                {/* Owner Row */}
                {owner && (
                  <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-100 dark:border-slate-850 pb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-650 flex items-center justify-center shrink-0 overflow-hidden text-[11px] font-black text-white">
                        {owner.avatar_url ? (
                          <img src={owner.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          owner.first_name.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {owner.last_name} {owner.first_name}
                        </span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 leading-none truncate mt-0.5">
                          {owner.email}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded uppercase tracking-wider">
                      Chủ sở hữu
                    </span>
                  </div>
                )}

                {/* Permissions List */}
                {permissions.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0 overflow-hidden text-[11px] font-black text-purple-750 dark:text-purple-300">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          p.first_name.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {p.last_name} {p.first_name}
                        </span>
                        <span className="text-[10px] text-slate-455 dark:text-slate-500 leading-none truncate mt-0.5">
                          {p.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={p.role}
                        onChange={(e) => handleChangeRole(p.user_id, e.target.value)}
                        className="h-7.5 text-[10px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg px-2 outline-none focus:ring-1 focus:ring-purple-500 dark:text-white cursor-pointer"
                      >
                        <option value="VIEWER">Người xem</option>
                        <option value="EDITOR">Người chỉnh sửa</option>
                      </select>

                      <button
                        onClick={() => handleRemovePermission(p.user_id)}
                        className="p-1.5 hover:bg-red-550/10 hover:text-red-500 rounded-lg text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
                        title="Xóa quyền truy cập"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {permissions.length === 0 && (
                  <span className="text-xs italic text-slate-455 text-center py-2">
                    Chưa có người dùng nào khác được cấp quyền truy cập.
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
