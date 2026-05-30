import { useState, useEffect } from "react";
import { HardDrive, Folder, File, Trash2, AlertTriangle } from "lucide-react";

// Storage management page — BR-AM-08 shows storage info

const MOCK_FILES = [
  { id: "f1", name: "giao_trinh_toan.pdf",   size: 2.4,  owner: "user101", type: "pdf",  uploadedAt: "01/05/2026" },
  { id: "f2", name: "bai_giang_vatly.pptx",  size: 5.1,  owner: "user102", type: "pptx", uploadedAt: "03/05/2026" },
  { id: "f3", name: "hoa_hoc_dai_cuong.pdf", size: 1.8,  owner: "user103", type: "pdf",  uploadedAt: "05/05/2026" },
  { id: "f4", name: "lap_trinh_python.zip",  size: 12.3, owner: "user104", type: "zip",  uploadedAt: "08/05/2026" },
  { id: "f5", name: "de_cuong_ai.docx",      size: 0.9,  owner: "user105", type: "docx", uploadedAt: "10/05/2026" },
  { id: "f6", name: "slide_oop_2026.pptx",   size: 8.7,  owner: "user106", type: "pptx", uploadedAt: "12/05/2026" },
  { id: "f7", name: "bai_tap_sql.pdf",       size: 3.2,  owner: "user107", type: "pdf",  uploadedAt: "15/05/2026" },
  { id: "f8", name: "project_final.zip",     size: 45.6, owner: "user108", type: "zip",  uploadedAt: "20/05/2026" },
];

const FILE_ICON_COLOR = { pdf: "#ef4444", pptx: "#f97316", docx: "#3b82f6", zip: "#8b5cf6" };

export default function AdminStorageManagement() {
  const [files, setFiles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast]     = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const usedGB   = 7.8;
  const limitGB  = 10;
  const pct      = Math.round((usedGB / limitGB) * 100);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5000/api/admin/storage/files", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setFiles(Array.isArray(data) ? data : MOCK_FILES); setLoading(false); })
      .catch(() => { setFiles(MOCK_FILES); setLoading(false); });
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async (file) => {
    try {
      await fetch(`http://localhost:5000/api/admin/storage/files/${file.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
    setFiles(prev => prev.filter(f => f.id !== file.id));
    showToast("error", `Đã xóa file: ${file.name}`);
    setConfirm(null);
  };

  const totalUsed = files.reduce((s, f) => s + (f.size || 0), 0).toFixed(1);

  return (
    <div>
      <div className="adm-page-header">
        <h1 className="adm-page-title">Storage Management</h1>
        <p className="adm-page-subtitle">Manage system files and storage usage</p>
      </div>

      {/* Storage overview cards */}
      <div className="adm-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28 }}>
        <div className="adm-stat-card storage">
          <div className="adm-stat-info">
            <div className="adm-stat-label">Total Used</div>
            <div className="adm-stat-value">{usedGB} GB</div>
            <div className="adm-storage-bar-wrap" style={{ marginTop: 10, width: 100 }}>
              <div className="adm-storage-bar-fill" style={{ width: `${pct}%`, background: pct > 80 ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
            </div>
          </div>
          <div className="adm-stat-icon"><HardDrive size={22} /></div>
        </div>

        <div className="adm-stat-card light">
          <div className="adm-stat-info">
            <div className="adm-stat-label">Total Limit</div>
            <div className="adm-stat-value">{limitGB} GB</div>
          </div>
          <div className="adm-stat-icon"><Folder size={22} /></div>
        </div>

        <div className="adm-stat-card ai">
          <div className="adm-stat-info">
            <div className="adm-stat-label">Available</div>
            <div className="adm-stat-value">{(limitGB - usedGB).toFixed(1)} GB</div>
          </div>
          <div className="adm-stat-icon">
            {pct > 80 ? <AlertTriangle size={22} style={{ color: "#ef4444" }} /> : <File size={22} />}
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="adm-table-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a0d2e" }}>Storage Usage</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pct > 80 ? "#dc2626" : "#7c3aed" }}>
            {pct}% used ({usedGB} GB / {limitGB} GB)
          </span>
        </div>
        <div className="adm-storage-bar-wrap" style={{ height: 14 }}>
          <div
            className="adm-storage-bar-fill"
            style={{ width: `${pct}%`, background: pct > 80 ? "linear-gradient(90deg,#ef4444,#dc2626)" : undefined }}
          />
        </div>
        {pct > 80 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} /> Storage usage is above 80%. Consider cleaning up large files.
          </div>
        )}
      </div>

      {/* Files table */}
      <div className="adm-table-card">
        <div className="adm-table-header">
          <span className="adm-table-title">System Files</span>
          <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{files.length} files</span>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text" style={{ color: "#a78bfa" }}>Loading files...</div></div>
        ) : files.length === 0 ? (
          <div className="adm-empty">
            <HardDrive className="adm-empty-icon" />
            <div className="adm-empty-text">No files found</div>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Owner</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: `${FILE_ICON_COLOR[file.type] || "#6b7280"}22`,
                        color: FILE_ICON_COLOR[file.type] || "#6b7280",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, textTransform: "uppercase", flexShrink: 0,
                      }}>
                        {file.type}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{file.name}</span>
                    </div>
                  </td>
                  <td><span style={{ color: FILE_ICON_COLOR[file.type] || "#6b7280", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>{file.type}</span></td>
                  <td style={{ color: file.size > 20 ? "#dc2626" : "#374151", fontWeight: file.size > 20 ? 700 : 500 }}>{file.size} MB</td>
                  <td style={{ color: "#6b7280" }}>{file.owner}</td>
                  <td style={{ color: "#9ca3af", fontSize: 12 }}>{file.uploadedAt}</td>
                  <td>
                    <button
                      id={`adm-del-file-${file.id}`}
                      className="adm-action-btn delete"
                      onClick={() => setConfirm({ file })}
                    >
                      <Trash2 size={11} /> Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && (
        <div className="adm-overlay" onClick={() => setConfirm(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Xóa file</div>
            <div className="adm-modal-body">Xóa vĩnh viễn file <strong>{confirm.file.name}</strong>? Hành động này không thể hoàn tác.</div>
            <div className="adm-modal-actions">
              <button className="adm-btn-cancel" onClick={() => setConfirm(null)}>Hủy</button>
              <button id="adm-storage-delete-confirm" className="adm-btn-confirm danger" onClick={() => handleDelete(confirm.file)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`adm-toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
