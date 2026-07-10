import React, { useState, useEffect } from 'react';
import { API_URL } from "@/config/api.js";
import { motion } from 'motion/react';
import { 
  ClockCounterClockwise, 
  Trash, 
  FileText, 
  MagnifyingGlass,
  Funnel,
  CaretRight,
  DotsThreeVertical
} from '@phosphor-icons/react';

export default function HistoryPage({ user, onPreview }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/documents/history/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_id) {
      fetchHistory();
    }
  }, [user]);

  const handleClearHistory = async () => {
    const isDeletingAll = selectedItems.length === 0;
    const confirmMsg = isDeletingAll 
      ? "Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem tài liệu không? Hành động này không thể hoàn tác."
      : `Bạn có chắc chắn muốn xóa ${selectedItems.length} mục đã chọn khỏi lịch sử không?`;
      
    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/documents/history/me`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds: isDeletingAll ? [] : selectedItems })
      });
      
      if (res.ok) {
        if (isDeletingAll) {
          setHistory([]);
        } else {
          setHistory(prev => prev.filter(doc => !selectedItems.includes(doc.document_id)));
          setSelectedItems([]);
        }
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

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

  const filteredHistory = history.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedHistory = filteredHistory.reduce((acc, doc) => {
    const dateObj = new Date(doc.viewed_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateLabel = "";
    if (dateObj.toDateString() === today.toDateString()) {
      dateLabel = `Hôm nay - ${dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      dateLabel = `Hôm qua - ${dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else {
      dateLabel = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

    if (!acc[dateLabel]) {
      acc[dateLabel] = [];
    }
    acc[dateLabel].push(doc);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold !text-slate-800 flex items-center gap-2">
            <ClockCounterClockwise className="w-7 h-7 text-indigo-600" weight="duotone" />
            Lịch sử xem tài liệu
          </h1>
          <p className="!text-slate-500 mt-1">Quản lý các tài liệu bạn đã tương tác gần đây</p>
        </div>
        
        {history.length > 0 && (
          <div className="flex items-center gap-3">
            {selectedItems.length > 0 && (
              <button 
                onClick={() => setSelectedItems([])}
                className="text-sm !text-slate-500 font-medium hover:!text-slate-700 transition-colors"
              >
                Bỏ chọn
              </button>
            )}
            <button 
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent !text-slate-500 text-sm font-medium border border-slate-200 rounded-lg hover:bg-red-50 hover:!text-red-600 hover:border-red-200 transition-all"
            >
              <Trash weight="bold" className="w-4 h-4" />
              {selectedItems.length > 0 ? `Xóa ${selectedItems.length} mục` : "Xóa toàn bộ lịch sử"}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 !text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm trong lịch sử (tên tài liệu, mã môn)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm !text-slate-800 placeholder:!text-slate-400"
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="flex flex-col gap-10 max-w-4xl mx-auto">
              {Object.entries(groupedHistory).map(([dateLabel, docs]) => (
                <div key={dateLabel} className="flex flex-col">
                  <h2 className="text-base font-bold !text-slate-800 mb-4 ml-2">{dateLabel}</h2>
                  <div className="flex flex-col">
                    {docs.map((doc, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => onPreview && onPreview(doc)}
                        className="flex items-center gap-4 py-2 px-2 hover:bg-slate-50 cursor-pointer group rounded-xl transition-colors"
                      >
                        <div className="px-2 shrink-0">
                          <input 
                            type="checkbox"
                            checked={selectedItems.includes(doc.document_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedItems(prev => [...prev, doc.document_id]);
                              } else {
                                setSelectedItems(prev => prev.filter(id => id !== doc.document_id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div className="w-12 text-sm font-medium !text-slate-500 shrink-0 text-center">
                          {new Date(doc.viewed_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <FileText weight="fill" className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0 justify-center flex-1 ml-2">
                          <h3 className="text-sm font-semibold !text-slate-800 truncate group-hover:!text-indigo-600 transition-colors">{doc.title}</h3>
                          <div className="text-[11px] !text-slate-500 font-medium truncate mt-0.5">
                            {doc.subject_code} • {doc.uploader_name || 'Hệ thống'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full !text-slate-400">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ClockCounterClockwise weight="duotone" className="w-12 h-12 !text-slate-300" />
              </div>
              <p className="text-lg font-medium !text-slate-600">Không tìm thấy lịch sử</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Bạn chưa xem tài liệu nào gần đây hoặc không có tài liệu nào khớp với từ khóa tìm kiếm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
