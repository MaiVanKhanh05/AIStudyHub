import { useState, useEffect, useMemo, useRef } from "react";
import { API_URL } from "@/config/api.js";
import { Cpu, Activity, AlertTriangle, ChevronDown, HardDrive } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useLanguage } from "../../context/LanguageContext";

function CustomDropdown({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value == value) || options[0];

  return (
    <div ref={wrapperRef} style={{ position: "relative", minWidth: 140 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "#fff", color: "#334155", fontSize: 13, padding: "8px 12px",
          borderRadius: 6, fontWeight: 600, border: "1px solid #cbd5e1", outline: "none", cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}
      >
        {selectedOption.label}
        <ChevronDown size={14} style={{ color: "#64748b", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", zIndex: 10,
          overflow: "hidden"
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
              style={{
                padding: "8px 12px", fontSize: 13, color: opt.value == value ? "#0f172a" : "#475569",
                fontWeight: opt.value == value ? 600 : 500, cursor: "pointer",
                background: opt.value == value ? "#f8fafc" : "transparent"
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStorageManagement() {
  const { language } = useLanguage();
  const [apiData, setApiData] = useState([]);
  const [overview, setOverview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const totalSpend = overview ? overview.totalSpend : apiData.reduce((s, a) => s + a.spend, 0).toFixed(2);
  const totalTokens = overview ? overview.totalTokens : apiData.reduce((s, a) => s + a.tokens, 0);
  const totalRequests = overview ? overview.totalRequests : apiData.reduce((s, a) => s + a.requests, 0);
  const budgetUsedPct = overview ? overview.budgetUsedPct : 0;

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    fetch(`${API_URL}/api/admin/api-usage?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setErrorMsg(data.message || "An error occurred fetching API usage.");
          setLoading(false);
          return;
        }
        if (data.dailyData) {
          setApiData(data.dailyData);
          setOverview(data.overview);
        } else if (Array.isArray(data)) {
          setApiData(data); // fallback
        }
        setLoading(false);
      })
      .catch(e => {
        setErrorMsg("Failed to connect to backend server.");
        console.error(e);
        setLoading(false);
      });

    // Fetch storage stats
    fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(console.error);

  }, [days, token]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes pulse-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton-pulse {
          background: #2A2B32;
          background-image: linear-gradient(90deg, #2A2B32 0px, #343541 40px, #2A2B32 80px);
          background-size: 600px;
          animation: pulse-shimmer 2s infinite linear forwards;
          border-radius: 4px;
        }
      `}</style>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-extrabold !text-slate-800 tracking-tight">{language === "vi" ? "Quản lý Lưu trữ & API" : "Storage & API Management"}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5 font-medium">{language === "vi" ? "Giám sát dung lượng hệ thống và tài nguyên AI" : "Monitor system storage and AI resources"}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{language === "vi" ? "Thời gian:" : "Time:"}</span>
          <CustomDropdown
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: language === "vi" ? "7 ngày qua" : "Last 7 days" },
              { value: 14, label: language === "vi" ? "14 ngày qua" : "Last 14 days" },
              { value: 30, label: language === "vi" ? "30 ngày qua" : "Last 30 days" }
            ]}
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: "#fef2f2", color: "#991b1b", padding: "16px 20px", borderRadius: "8px",
          border: "1px solid #f87171", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}>
          <AlertTriangle size={20} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{language === "vi" ? "Lỗi OpenAI API" : "OpenAI API Error"}</div>
            <div style={{ fontSize: "13px", color: "#b91c1c" }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* --- API USAGE DASHBOARD (Dark Theme - OpenAI Style) --- */}
      <div
        style={{
          background: "#202123",
          borderRadius: "8px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          border: "1px solid #343541",
          marginBottom: 40
        }}
      >
        {/* Left Side: Main Chart */}
        <div style={{ flex: "1 1 65%", padding: "24px", borderRight: "1px solid #343541", minWidth: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
            <div>
              <div style={{ fontSize: 13, color: "#c5c5d2", fontWeight: 500, marginBottom: 4 }}>Total Spend ({days} days)</div>
              {loading ? (
                <div className="skeleton-pulse" style={{ width: 120, height: 28, marginTop: 4 }}></div>
              ) : (
                <div style={{ fontSize: 24, fontWeight: 700, color: "#ececf1", lineHeight: 1.2 }}>${totalSpend}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {/* Budget Indicator */}
              {loading ? (
                <div style={{ textAlign: "right" }}>
                  <div className="skeleton-pulse" style={{ width: 70, height: 12, marginBottom: 4, marginLeft: "auto" }}></div>
                  <div className="skeleton-pulse" style={{ width: 100, height: 6, borderRadius: 4 }}></div>
                  <div className="skeleton-pulse" style={{ width: 60, height: 12, marginTop: 4, marginLeft: "auto" }}></div>
                </div>
              ) : overview && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#8e8ea0", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Budget Used</div>
                  <div style={{ width: 100, height: 6, background: "#343541", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${budgetUsedPct}%`, height: "100%", background: budgetUsedPct > 80 ? "#ef4444" : "#10b981", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#c5c5d2", marginTop: 4, fontWeight: 500 }}>{budgetUsedPct}% of $50</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ height: 260, width: "100%" }}>
            {loading ? (
              <div className="skeleton-pulse" style={{ width: "100%", height: "100%", borderRadius: 8 }}></div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={apiData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={32}>
                  <XAxis dataKey="date" axisLine={{ stroke: "#444654" }} tickLine={false} tick={{ fontSize: 11, fill: "#8e8ea0" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8e8ea0" }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    cursor={{ fill: "#2A2B32" }}
                    contentStyle={{ background: "#000", border: "1px solid #343541", borderRadius: "8px", color: "#ececf1", fontSize: 12 }}
                    itemStyle={{ color: "#8b5cf6" }}
                    formatter={(value) => [`$${value}`, "Spend"]}
                  />
                  <Bar dataKey="spend" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Stats sidebar */}
        <div style={{ flex: "1 1 30%", display: "flex", flexDirection: "column", minWidth: 250 }}>

          {/* Tokens Area Chart */}
          <div style={{ padding: "24px", borderBottom: "1px solid #343541", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, color: "#c5c5d2", fontWeight: 500, marginBottom: 4 }}>Total tokens</div>
            {loading ? (
              <div className="skeleton-pulse" style={{ width: 100, height: 24, marginBottom: 16 }}></div>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ececf1", marginBottom: 16 }}>{Number(totalTokens).toLocaleString()}</div>
            )}
            <div style={{ height: 60, width: "100%", marginTop: "auto" }}>
              {loading ? (
                <div className="skeleton-pulse" style={{ width: "100%", height: "100%", borderRadius: 4 }}></div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={apiData}>
                    <Tooltip contentStyle={{ background: "#000", border: "1px solid #343541", color: "#fff", fontSize: 12 }} formatter={(val) => [val, "Tokens"]} labelStyle={{ display: "none" }} />
                    <Area type="monotone" dataKey="tokens" stroke="#ef4444" fill="transparent" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Requests Bar Chart */}
          <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, color: "#c5c5d2", fontWeight: 500, marginBottom: 4 }}>Total requests</div>
            {loading ? (
              <div className="skeleton-pulse" style={{ width: 80, height: 24, marginBottom: 16 }}></div>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ececf1", marginBottom: 16 }}>{Number(totalRequests).toLocaleString()}</div>
            )}
            <div style={{ height: 60, width: "100%", marginTop: "auto" }}>
              {loading ? (
                <div className="skeleton-pulse" style={{ width: "100%", height: "100%", borderRadius: 4 }}></div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={apiData} barSize={16}>
                    <Tooltip contentStyle={{ background: "#000", border: "1px solid #343541", color: "#fff", fontSize: 12 }} formatter={(val) => [val, "Requests"]} labelStyle={{ display: "none" }} />
                    <Bar dataKey="requests" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- STORAGE CAPACITY DASHBOARD --- */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <HardDrive size={18} color="#6366f1" /> {language === "vi" ? "Dung lượng hệ thống" : "System Storage"}
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}>{language === "vi" ? "Quản lý không gian lưu trữ tệp tin và cơ sở dữ liệu hệ thống" : "Manage file storage space and system database"}</p>
        </div>

        <div style={{ padding: "24px", display: "flex", flexWrap: "wrap", gap: "32px" }}>
          {/* File Storage */}
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{language === "vi" ? "Lưu trữ Tệp tin (PDF, Docx...)" : "File Storage (PDF, Docx...)"}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#4f46e5", background: "#e0e7ff", padding: "2px 10px", borderRadius: "20px" }}>
                {stats ? `${stats.totalStorageUsed} GB` : "0 GB"}
              </span>
            </div>
            <div style={{ width: "100%", height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: stats ? `${Math.min((stats.totalStorageUsed / stats.totalStorageLimit) * 100, 100)}%` : "0%",
                  background: stats && (stats.totalStorageUsed / stats.totalStorageLimit) > 0.8 ? "#ef4444" : "#6366f1",
                  transition: "width 1s ease-in-out"
                }}
              />
            </div>
            {stats && stats.fileTypeBreakdown && stats.fileTypeBreakdown.length > 0 && (
              <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                {stats.fileTypeBreakdown.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>{item.type}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{item.count} files ({item.sizeGB} GB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DB Storage */}
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{language === "vi" ? "Cơ sở dữ liệu (Database)" : "Database"}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#059669", background: "#d1fae5", padding: "2px 10px", borderRadius: "20px" }}>
                {stats ? `${stats.dbStorageUsed} GB` : "0 GB"}
              </span>
            </div>
            <div style={{ width: "100%", height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: stats ? `${Math.min((stats.dbStorageUsed / 5) * 100, 100)}%` : "0%",
                  background: "#10b981",
                  transition: "width 1s ease-in-out"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
