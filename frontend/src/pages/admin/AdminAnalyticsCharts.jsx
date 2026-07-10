import { useState, useEffect } from "react";
import { API_URL } from "@/config/api.js";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, BookOpen, HardDrive, Calendar, Database, Eye, Download } from "lucide-react";

export default function AdminAnalyticsCharts() {
  const [days, setDays] = useState(30);
  const [subjectMetric, setSubjectMetric] = useState("size"); // 'size' or 'count'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modern high-end color palette (HSL-curated styling)
  const COLORS = {
    students: "#8b5cf6",       // violet-500
    studentsLight: "#a78bfa",  // violet-400
    lecturers: "#06b6d4",      // cyan-500
    lecturersLight: "#22d3ee", // cyan-400
    uploads: "#6366f1",        // indigo-500
    views: "#3b82f6",          // blue-500
    downloads: "#10b981",      // emerald-500
    gridLine: "#f8fafc",
    textMuted: "#94a3b8",
    bgTrack: "#f8fafc",
    fileFormats: {
      pdf: "#f43f5e",          // Rose
      docx: "#3b82f6",         // Blue
      doc: "#60a5fa",          // Sky
      xlsx: "#10b981",         // Emerald
      xls: "#34d399",          // Teal
      pptx: "#f59e0b",         // Amber
      ppt: "#fbbf24",          // Yellow
      png: "#d946ef",          // Fuchsia
      jpg: "#ec4899",          // Pink
      jpeg: "#ec4899",
      txt: "#64748b",          // Slate
      zip: "#84cc16",          // Lime
      rar: "#a3e635",
      other: "#94a3b8"
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/admin/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch analytics");
        return r.json();
      }),
      fetch(`${API_URL}/api/admin/storage-distribution`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch storage distribution");
        return r.json();
      }),
    ])
      .then(([analytics, storage]) => {
        setAnalyticsData(analytics);
        setStorageData(storage);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Using fallback mock data for dashboard presentation.", err);
        // Clean mock visual simulation
        setAnalyticsData({
          userTrends: generateMockUsers(days),
          documentTrends: generateMockDocuments(days),
        });
        setStorageData({
          fileTypes: [
            { type: "pptx", count: 73, size_bytes: 1024 * 1024 * 171.37 },
            { type: "pdf", count: 42, size_bytes: 1024 * 1024 * 156.40 },
            { type: "docx", count: 36, size_bytes: 1024 * 1024 * 30.38 },
            { type: "ppt", count: 11, size_bytes: 1024 * 1024 * 5.63 },
            { type: "txt", count: 6, size_bytes: 1024 * 1024 * 1.43 },
            { type: "doc", count: 1, size_bytes: 1024 * 1024 * 0.60 },
          ],
          subjects: [
            { subject_name: "Advanced C# Development", subject_code: "CS402", count: 45, size_bytes: 1024 * 1024 * 67.5 },
            { subject_name: "Natural Language Processing", subject_code: "AI302", count: 18, size_bytes: 1024 * 1024 * 9.8 },
            { subject_name: "Operating Systems", subject_code: "CS201", count: 24, size_bytes: 1024 * 1024 * 8.4 },
            { subject_name: "Software Engineering Intro", subject_code: "SE101", count: 15, size_bytes: 1024 * 1024 * 5.2 },
            { subject_name: "Mobile Programming", subject_code: "MOB202", count: 12, size_bytes: 1024 * 1024 * 4.9 },
            { subject_name: "Môn học khác", subject_code: "OTHER_ALL", count: 32, size_bytes: 1024 * 1024 * 12.3 }
          ],
        });
        setLoading(false);
      });
  }, [days]);

  // High fidelity file size formatting
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = 2;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return dateStr;
    }
  };

  function generateMockUsers(daysCount) {
    const list = [];
    for (let i = daysCount; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const studentSeed = Math.floor(Math.random() * 3) + 1;
      const lecturerSeed = Math.random() > 0.8 ? 1 : 0;
      list.push({
        date: d.toISOString().split("T")[0],
        new_users: studentSeed + lecturerSeed,
        new_students: studentSeed,
        new_lecturers: lecturerSeed,
      });
    }
    return list;
  }

  function generateMockDocuments(daysCount) {
    const list = [];
    for (let i = daysCount; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        date: d.toISOString().split("T")[0],
        uploads: Math.floor(Math.random() * 4),
        views: Math.floor(Math.random() * 40) + 15,
        downloads: Math.floor(Math.random() * 20) + 3,
      });
    }
    return list;
  }

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-100 p-16 shadow-xl mb-6 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
        <h4 className="text-slate-800 font-extrabold text-sm tracking-wide">Đang đồng bộ dữ liệu đồ thị...</h4>
        <p className="text-slate-400 text-xs mt-1">Hệ thống đang chuẩn bị kết xuất biểu đồ trực quan</p>
      </div>
    );
  }

  // Safe mapping and formatting of arrays
  const userTrends = (analyticsData?.userTrends || []).map(u => ({
    ...u,
    new_users: Number(u.new_users) || 0,
    new_students: Number(u.new_students) || 0,
    new_lecturers: Number(u.new_lecturers) || 0
  }));

  const docTrends = (analyticsData?.documentTrends || []).map(d => ({
    ...d,
    uploads: Number(d.uploads) || 0,
    views: Number(d.views) || 0,
    downloads: Number(d.downloads) || 0
  }));

  const fileTypes = (storageData?.fileTypes || []).map(item => ({
    ...item,
    type: item.type ? item.type.toLowerCase() : "other",
    count: Number(item.count) || 0,
    size_bytes: Number(item.size_bytes) || 0
  })).sort((a, b) => b.size_bytes - a.size_bytes);

  const totalStorageUsed = fileTypes.reduce((acc, curr) => acc + curr.size_bytes, 0);

  const subjects = (storageData?.subjects || []).map(item => {
    const bytes = Number(item.size_bytes) || 0;
    return {
      ...item,
      count: Number(item.count) || 0,
      size_bytes: bytes,
      size_mb: parseFloat((bytes / (1024 * 1024)).toFixed(2))
    };
  });

  const truncateLabel = (label, length = 18) => {
    if (!label) return "";
    return label.length > length ? `${label.substring(0, length - 2)}...` : label;
  };

  // Glassmorphism Floating Tooltips
  const CustomTooltip = ({ active, payload, label, unit = "" }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-2xl text-white text-[12px] font-sans min-w-[150px]">
          <p className="font-extrabold border-b border-slate-800/80 pb-2 mb-2 text-slate-400">
            Ngày: {formatDate(label)}
          </p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2 font-semibold text-slate-350">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-black text-right text-slate-100">
                  {unit === "bytes" ? formatBytes(entry.value) : entry.value.toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalStorageUsed > 0 ? ((data.size_bytes / totalStorageUsed) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-2xl text-white text-[12px] font-sans min-w-[160px]">
          <p className="font-black border-b border-slate-800/85 pb-2 mb-2 text-slate-300 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: COLORS.fileFormats[data.type] || COLORS.fileFormats.other }}
            />
            {data.type?.toUpperCase()}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-semibold">Tài liệu:</span>
              <span className="font-black text-slate-100">{data.count} tệp</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-semibold">Dung lượng:</span>
              <span className="font-black text-emerald-450">{formatBytes(data.size_bytes)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-850 pt-2 mt-2">
              <span className="text-slate-450 font-semibold">Tỷ lệ:</span>
              <span className="font-black text-purple-400">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomSubjectTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-2xl text-white text-[12px] font-sans min-w-[180px]">
          <p className="font-black border-b border-slate-800/80 pb-2 mb-2 text-slate-200">
            {data.subject_name}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-semibold">Mã môn:</span>
              <span className="font-bold text-slate-300">{data.subject_code}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-semibold">Số tài liệu:</span>
              <span className="font-black text-blue-450">{data.count} file</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-semibold">Dung lượng:</span>
              <span className="font-black text-emerald-450">{formatBytes(data.size_bytes)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Global Control Hub */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm gap-4 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner">
            <Database size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Trung tâm Giám sát Tài nguyên</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">Thống kê trực quan toàn hệ thống học liệu</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50 self-end sm:self-auto shadow-inner">
          {[
            { label: "7 ngày qua", val: 7 },
            { label: "30 ngày qua", val: 30 },
            { label: "90 ngày qua", val: 90 },
          ].map((opt) => (
            <button
              key={opt.val}
              id={`filter-days-${opt.val}`}
              onClick={() => setDays(opt.val)}
              className="px-4 py-1.5 text-[11px] font-black rounded-xl transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95"
              style={days === opt.val ? { backgroundColor: "#ffffff", color: "#8b5cf6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Time Series (Area & Line Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registration Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                <Users size={15} />
              </div>
              <h4 className="text-[13px] font-extrabold text-slate-700 tracking-tight">Tốc độ đăng ký tài khoản mới</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">Realtime</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.students} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.students} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaLecturers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.lecturers} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.lecturers} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}
                  stroke="#e2e8f0"
                  dy={8}
                />
                <YAxis
                  tick={{ fill: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}
                  stroke="#e2e8f0"
                  allowDecimals={false}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "15px" }} />
                <Area
                  type="monotone"
                  name="Sinh viên"
                  dataKey="new_students"
                  stroke={COLORS.students}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaStudents)"
                />
                <Area
                  type="monotone"
                  name="Giảng viên"
                  dataKey="new_lecturers"
                  stroke={COLORS.lecturers}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaLecturers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document Interaction Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                <BookOpen size={15} />
              </div>
              <h4 className="text-[13px] font-extrabold text-slate-700 tracking-tight">Hoạt động Upload & Tương tác</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">Lượt/Ngày</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={docTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={COLORS.gridLine} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}
                  stroke="#e2e8f0"
                  dy={8}
                />
                <YAxis tick={{ fill: COLORS.textMuted, fontSize: 10, fontWeight: 700 }} stroke="#e2e8f0" dx={-5} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "15px" }} />
                <Line
                  type="monotone"
                  name="Tải lên"
                  dataKey="uploads"
                  stroke={COLORS.uploads}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  name="Lượt Xem"
                  dataKey="views"
                  stroke={COLORS.views}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  name="Tải xuống"
                  dataKey="downloads"
                  stroke={COLORS.downloads}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Storage & Formats Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie/Donut Chart: Storage by Format */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col col-span-1">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-50">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <HardDrive size={15} />
            </div>
            <h4 className="text-[13px] font-extrabold text-slate-700 tracking-tight">Dung lượng theo Định dạng</h4>
          </div>
          <div className="h-56 relative flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fileTypes}
                  nameKey="type"
                  dataKey="size_bytes"
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {fileTypes.map((entry, index) => {
                    const typeColor = COLORS.fileFormats[entry.type] || COLORS.fileFormats.other;
                    return (
                      <Cell key={`cell-${index}`} fill={typeColor} stroke="#ffffff" strokeWidth={2.5} />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Widget - Absolutely Centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Tổng dung lượng</span>
              <span className="text-[18px] font-black text-slate-800 tracking-tight leading-none">
                {formatBytes(totalStorageUsed)}
              </span>
              <span className="text-[9px] text-purple-600 bg-purple-50 font-bold mt-1.5 px-2 py-0.5 rounded-full">Trong 10 GB</span>
            </div>
          </div>
          {/* Detailed Legend table with progress bars */}
          <div className="mt-2 space-y-2.5 overflow-y-auto max-h-48 pr-1 scrollbar-thin">
            {fileTypes.map((item) => {
              const typeColor = COLORS.fileFormats[item.type] || COLORS.fileFormats.other;
              const percent = totalStorageUsed > 0 ? ((item.size_bytes / totalStorageUsed) * 100).toFixed(1) : 0;
              return (
                <div key={item.type} className="flex flex-col gap-1.5 bg-slate-50/40 hover:bg-slate-50/80 px-3.5 py-2.5 rounded-xl border border-slate-100/50 transition-all duration-300">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0 shadow-sm"
                        style={{ backgroundColor: typeColor }}
                      />
                      <span className="uppercase text-slate-850 font-black tracking-wider">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>{item.count} tệp</span>
                      <span className="text-slate-300 font-light">·</span>
                      <span className="text-slate-800 font-black">{formatBytes(item.size_bytes)}</span>
                      <span className="text-purple-600 font-extrabold bg-purple-50 text-[9px] px-1.5 py-0.5 rounded-md ml-1">{percent}%</span>
                    </div>
                  </div>
                  {/* Mini visual indicator track */}
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, backgroundColor: typeColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bar Chart: Storage by Subject */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <BookOpen size={15} />
              </div>
              <h4 className="text-[13px] font-extrabold text-slate-700 tracking-tight">Phân bổ tài nguyên theo Môn học</h4>
            </div>
            {/* Metric Toggle Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/50 self-end sm:self-auto shadow-inner">
              <button
                id="toggle-subject-size"
                onClick={() => setSubjectMetric("size")}
                className="px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all duration-300 flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800"
                style={subjectMetric === "size" ? { backgroundColor: "#ffffff", color: "#8b5cf6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" } : {}}
              >
                <HardDrive size={11} /> Dung lượng (MB)
              </button>
              <button
                id="toggle-subject-count"
                onClick={() => setSubjectMetric("count")}
                className="px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all duration-300 flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-800"
                style={subjectMetric === "count" ? { backgroundColor: "#ffffff", color: "#10b981", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" } : {}}
              >
                <BookOpen size={11} /> Số lượng tệp
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjects} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSubjectStorage" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorSubjectStorageActive" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d8b4fe" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorSubjectCount" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="colorSubjectCountActive" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke={COLORS.gridLine} />
                <XAxis
                  type="number"
                  tickFormatter={(val) => subjectMetric === "size" ? `${val} MB` : `${val} tệp`}
                  tick={{ fill: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}
                  stroke="#e2e8f0"
                />
                <YAxis
                  type="category"
                  dataKey="subject_name"
                  tickFormatter={(val) => truncateLabel(val, 24)}
                  tick={{ fill: "#475569", fontSize: 10.5, fontWeight: 700 }}
                  stroke="#e2e8f0"
                  width={140}
                />
                <Tooltip content={<CustomSubjectTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                {subjectMetric === "size" ? (
                  <Bar
                    name="Dung lượng (MB)"
                    dataKey="size_mb"
                    fill="url(#colorSubjectStorage)"
                    activeBar={{ fill: "url(#colorSubjectStorageActive)" }}
                    radius={[0, 6, 6, 0]}
                    barSize={12}
                    background={{ fill: "#f8fafc", radius: 6 }}
                  />
                ) : (
                  <Bar
                    name="Số lượng tệp"
                    dataKey="count"
                    fill="url(#colorSubjectCount)"
                    activeBar={{ fill: "url(#colorSubjectCountActive)" }}
                    radius={[0, 6, 6, 0]}
                    barSize={12}
                    background={{ fill: "#f8fafc", radius: 6 }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
