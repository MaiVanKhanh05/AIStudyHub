import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText, BookmarkSimple, ClockCounterClockwise, Bell,
  UploadSimple, ChatCircle, EnvelopeSimple, Sparkle,
  ArrowRight,
  CaretRight,
  PaperPlaneRight,
  Robot,
  Paperclip,
  X,
  Cloud,
  Users
} from '@phosphor-icons/react';

// Soft SaaS Card Component
function SaasCard({ children, className = "", delay = 0, onClick, hoverable = true, pClass = "p-6 md:p-8" }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative ${className}`}
    >
      <div
        onClick={onClick}
        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        className={`w-full h-full rounded-2xl border ${pClass} flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ${hoverable ? 'cursor-pointer hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1' : ''}`}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function HomeDashboard({
  user,
  fullName,
  documents = [],
  bookmarkedDocs = [],
  notificationsList = [],
  setActiveTab,
  handleSendChatMessage,
  handleApproveAccess,
  handleDenyAccess,
  handleMarkAsRead,
  handlePreviewClick
}) {
  const [quickQuery, setQuickQuery] = useState("");
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef(null);
  const [recentCommunityDocs, setRecentCommunityDocs] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);

  useEffect(() => {
    // Load view history from backend
    const fetchHistory = async () => {
      if (user?.user_id) {
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const res = await fetch(`http://localhost:5000/api/documents/history/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setViewHistory(data);
          }
        } catch (err) {
          console.error("Failed to load history from server", err);
        }
      }
    };
    fetchHistory();
  }, [user]);

  useEffect(() => {
    const fetchLatestCommunityDoc = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/documents/community", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const filtered = data.filter(d => {
            const docDate = new Date(d.upload_date || d.created_at);
            return docDate >= threeDaysAgo;
          });
          setRecentCommunityDocs(filtered);
        }
      } catch (err) {
        console.error("Error fetching latest community doc:", err);
      }
    };
    fetchLatestCommunityDoc();
  }, []);

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "Không xác định";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      if (diffHours === 0) return "Vừa xong";
      return `${diffHours} giờ trước`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifs = notificationsList.filter(n => !n.is_read).length;

  const handleQuickChatSubmit = (e) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;

    // Switch to AI tab
    setActiveTab('AI Assistant');

    // Send message using the global handler passed from Home.jsx
    if (handleSendChatMessage) {
      // Need a small timeout to ensure the tab switches before sending
      setTimeout(() => {
        handleSendChatMessage(quickQuery.trim(), []);
      }, 50);
    }
  };

  return (
    <div
      style={{ color: '#1e293b' }}
      className="w-full h-full font-sans selection:bg-indigo-100 selection:text-indigo-900 relative"
    >
      {/* Top Header / Actions */}
      <div className="w-full flex justify-end px-4 md:px-8 pt-6 absolute top-0 right-0 z-50">
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Bell weight="bold" className="w-6 h-6 text-slate-600" />
            {unreadNotifs > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showNotifMenu && (
            <div className="absolute top-14 right-0 w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Thông báo mới</h3>
                {unreadNotifs > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{unreadNotifs} chưa đọc</span>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2 bg-slate-50/30">
                {notificationsList.length > 0 ? (
                  notificationsList.slice(0, 5).map((notif, idx) => {
                    const senderName = notif.sender_first_name
                      ? `${notif.sender_last_name} ${notif.sender_first_name}`.trim()
                      : "Người dùng hệ thống";
                    const senderInitials = senderName.split(" ").slice(-2).map(n => n[0]).join("").toUpperCase();

                    return (
                      <div
                        key={notif.notification_id || idx}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${!notif.is_read ? 'bg-white border-indigo-100 shadow-[0_2px_8px_-2px_rgba(99,102,241,0.1)]' : 'bg-white/60 border-slate-100 hover:bg-white'}`}
                        onClick={() => {
                          if (!notif.is_read && handleMarkAsRead) {
                            handleMarkAsRead(notif.notification_id);
                          }
                          setShowNotifMenu(false);
                          setActiveTab('Notifications');
                        }}
                      >
                        {/* Header: Avatar, Name, and Date */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            {notif.sender_avatar ? (
                              <img src={notif.sender_avatar} alt={senderName} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                {senderInitials || "AI"}
                              </div>
                            )}
                            {!notif.is_read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                            <span className="text-sm font-semibold text-slate-800 truncate">{senderName}</span>
                            <span className={`text-xs break-words whitespace-normal ${!notif.is_read ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                              {notif.message}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(notif.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions & Document Info */}
                        {notif.type === "ACCESS_REQUEST" && (
                          <div className="flex flex-col gap-2.5 mt-1 ml-12">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {notif.action_status === "PENDING" ? (
                                <>
                                  <button
                                    onClick={() => handleApproveAccess && handleApproveAccess(notif.notification_id)}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                                  >
                                    Phê duyệt
                                  </button>
                                  <button
                                    onClick={() => handleDenyAccess && handleDenyAccess(notif.notification_id)}
                                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              ) : notif.action_status === "APPROVED" ? (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">Đã phê duyệt</span>
                              ) : (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">Đã từ chối</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Không có thông báo nào
                  </div>
                )}
              </div>
              <div
                onClick={() => {
                  setShowNotifMenu(false);
                  setActiveTab('Notifications');
                }}
                className="p-3.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors border-t border-slate-100"
              >
                Xem tất cả thông báo
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col gap-12 md:gap-16">

        {/* Centered Hero Section */}
        <section className="flex flex-col items-center justify-center text-center gap-8 mt-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col gap-6 items-center"
          >
            {/* Headline */}
            <h1
              style={{ color: '#0f172a' }}
              className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.15]"
            >
              Quản lý tài liệu thông minh <span style={{ color: '#6366f1' }}>cùng AI</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{ color: '#64748b' }}
              className="text-lg md:text-xl font-normal leading-relaxed max-w-3xl px-4"
            >
              Lưu trữ, tìm kiếm và quản lý tài liệu một cách hiệu quả. Tận dụng AI để trò chuyện với tài liệu, tóm tắt nội dung, tìm kiếm thông tin và hỗ trợ xử lý tài liệu nhanh chóng.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
              <button
                onClick={() => setActiveTab('Document Management')}
                style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
                className="w-[260px] h-[72px] justify-center rounded-2xl hover:opacity-90 font-semibold text-lg shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
              >
                Tải tài liệu lên <UploadSimple weight="bold" className="w-5 h-5 ml-1" />
              </button>

              <button
                onClick={() => setActiveTab('Community')}
                style={{ backgroundColor: 'transparent', color: '#334155' }}
                className="w-[260px] h-[72px] justify-center rounded-2xl border-2 border-[#e2e8f0] hover:bg-slate-50 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.35)] hover:text-indigo-600 font-semibold text-lg transition-all duration-300 cursor-pointer flex items-center gap-2"
              >
                Xem Cộng đồng
              </button>
            </div>
          </motion.div>
        </section>

        {/* NexusAI Assistant Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-4xl mx-auto mt-4 px-2"
        >
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                <Robot weight="fill" className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-800 leading-tight">AI Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-medium text-emerald-500">Online</span>
                </div>
              </div>
            </div>

            {/* Chat Body (Static Preview) */}
            <div className="p-6 flex flex-col gap-5 bg-[#fafafa]">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-indigo-500 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm font-medium shadow-sm max-w-[80%]">
                  Hãy giúp tôi học tốt hơn nhé?
                </div>
              </div>

              {/* Bot Message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
                  <Robot weight="fill" className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-100 text-slate-700 px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm font-medium shadow-sm max-w-[85%] leading-relaxed">
                  Tôi có thể giúp bạn phân tích dữ liệu, viết code, trả lời câu hỏi và nhiều hơn nữa. Bạn muốn khám phá điều gì hôm nay?
                </div>
              </div>
            </div>

            {/* Chat Input Footer */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form
                onSubmit={handleQuickChatSubmit}
                className="w-full flex items-center gap-3"
              >
                <input
                  type="text"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Hãy hỏi tôi bất cứ điều gì nhé..."
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#0f172a' }}
                  className="flex-1 rounded-2xl border px-5 py-3.5 focus:outline-none focus:ring-0 focus:border-indigo-400 focus:bg-white text-sm font-medium placeholder:text-slate-400 placeholder:font-normal transition-all shadow-sm"
                />

                <button
                  type="submit"
                  disabled={!quickQuery.trim()}
                  style={{
                    backgroundColor: quickQuery.trim() ? '#6366f1' : '#cbd5e1',
                    color: '#ffffff'
                  }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Sparkle weight="fill" className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)] mt-4">


          {/* Community Trending Docs (Col 12) */}
          <SaasCard className="md:col-span-12 md:row-span-1" delay={0.3} onClick={() => setActiveTab('Community')}>
            <div className="flex flex-col h-full gap-4">
              <div style={{ borderColor: '#f1f5f9' }} className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <Users weight="bold" className="w-5 h-5" style={{ color: '#6366f1' }} />
                  <h3 style={{ color: '#1e293b' }} className="text-lg font-semibold">Cộng đồng chia sẻ gần đây</h3>
                </div>
                <span style={{ color: '#d946ef' }} className="text-sm font-medium hover:opacity-80 flex items-center gap-1 group/link cursor-pointer">
                  Xem cộng đồng <CaretRight weight="bold" className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {recentCommunityDocs.length > 0 ? (
                  recentCommunityDocs.map((doc, idx) => (
                    <div key={idx} className="flex-none w-72 flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 line-clamp-1">{doc.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{doc.subject_code}</span>
                          <span className="truncate">{doc.topic_name || "Chưa phân loại"}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 mt-1">Bởi {doc.uploader_name} • {getRelativeTime(doc.upload_date || doc.created_at)}</span>
                    </div>
                  ))
                ) : (
                  <div className="w-full flex items-center justify-center text-sm text-slate-400 italic py-4">
                    Không có tài liệu nào được chia sẻ trong 3 ngày qua.
                  </div>
                )}
              </div>
            </div>
          </SaasCard>

          {/* Recent Uploads & Viewed Docs (Col 8) */}
          <SaasCard className="md:col-span-8 md:row-span-3" delay={0.4}>
            <div className="flex flex-col h-full gap-5">
              {/* Top Half: Uploaded */}
              <div className="flex flex-col flex-1 min-h-0">
                <div style={{ borderColor: '#f1f5f9' }} className="flex justify-between items-center border-b pb-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <UploadSimple weight="bold" className="w-5 h-5" style={{ color: '#6366f1' }} />
                    <h3 style={{ color: '#1e293b' }} className="text-lg font-semibold">Tài liệu upload gần đây</h3>
                  </div>
                  <span
                    onClick={() => setActiveTab('Document Management')}
                    style={{ color: '#6366f1' }}
                    className="text-sm font-medium hover:opacity-80 flex items-center gap-1 group/link cursor-pointer"
                  >
                    Xem tất cả <CaretRight weight="bold" className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </span>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  {documents.length > 0 ? documents.slice(0, 3).map((doc, idx) => (
                    <div
                      key={`upload-${idx}`}
                      onClick={() => handlePreviewClick && handlePreviewClick(doc)}
                      className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                        <FileText weight="fill" className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span style={{ color: '#334155' }} className="text-sm font-medium truncate">{doc.title}</span>
                        <span style={{ color: '#94a3b8' }} className="text-xs mt-0.5">
                          {doc.subject_code} • {getRelativeTime(doc.upload_date)}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8' }} className="flex items-center justify-center h-full text-sm">
                      Bạn chưa tải lên tài liệu nào gần đây
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-slate-100 shrink-0"></div>

              {/* Bottom Half: Viewed */}
              <div className="flex flex-col flex-1 min-h-0">
                <div style={{ borderColor: '#f1f5f9' }} className="flex justify-between items-center border-b pb-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <ClockCounterClockwise weight="bold" className="w-5 h-5" style={{ color: '#6366f1' }} />
                    <h3 style={{ color: '#1e293b' }} className="text-lg font-semibold">Tài liệu đã xem gần đây</h3>
                  </div>
                  <span
                    onClick={() => setActiveTab('History')}
                    style={{ color: '#6366f1' }}
                    className="text-sm font-medium hover:opacity-80 flex items-center gap-1 group/link cursor-pointer"
                  >
                    Xem tất cả <CaretRight weight="bold" className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                  </span>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  {viewHistory.length > 0 ? viewHistory.slice(0, 3).map((doc, idx) => (
                    <div
                      key={`view-${idx}`}
                      onClick={() => handlePreviewClick && handlePreviewClick(doc)}
                      className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                        <FileText weight="fill" className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span style={{ color: '#334155' }} className="text-sm font-medium truncate">{doc.title}</span>
                        <span style={{ color: '#94a3b8' }} className="text-xs mt-0.5">
                          {doc.subject_code} • {getRelativeTime(doc.viewed_at)}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8' }} className="flex items-center justify-center h-full text-sm">
                      Bạn chưa xem tài liệu nào gần đây
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SaasCard>

          {/* Storage (Col 4) */}
          <SaasCard className="md:col-span-4 md:row-span-1" delay={0.4} hoverable={false} pClass="p-4 md:p-6">
            <div className="flex flex-col justify-center h-full gap-4">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-5 h-5 text-indigo-500" weight="duotone" />
                  <span style={{ color: '#1e293b' }} className="text-sm font-semibold">Dung lượng đã sử dụng</span>
                </div>
                <span style={{ color: '#6366f1' }} className="text-sm font-bold">1%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '1%' }}></div>
              </div>
              <span style={{ color: '#94a3b8' }} className="text-[10px] font-semibold text-right mt-0.5 tracking-wider">0.01 GB / 2 GB</span>
            </div>
          </SaasCard>

          {/* Uploaded Documents (Col 4) */}
          <SaasCard className="md:col-span-4 md:row-span-1" delay={0.5} onClick={() => setActiveTab('Document Management')} pClass="p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-full">
              <div style={{ color: '#0f172a', fontSize: '4rem', lineHeight: 1 }} className="font-bold -mb-1">{documents.length}</div>
              <h3 style={{ color: '#475569' }} className="text-sm font-semibold text-center mt-2">
                Tài liệu đã tải lên
              </h3>
              <div className="w-8 h-px bg-slate-200 my-3"></div>
              <span style={{ color: '#94a3b8' }} className="text-[10px] uppercase font-bold tracking-widest">của bạn</span>
            </div>
          </SaasCard>

          {/* Contact (Col 4) */}
          <SaasCard className="md:col-span-4 md:row-span-1" delay={0.6} onClick={() => window.location.href = 'mailto:support@aistudyhub.com'} pClass="p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-full">
              <h3 style={{ color: '#1e293b' }} className="text-2xl font-bold text-center">Liên hệ<br />hỗ trợ</h3>
            </div>
          </SaasCard>

        </div>
      </div>
    </div>
  );
}
