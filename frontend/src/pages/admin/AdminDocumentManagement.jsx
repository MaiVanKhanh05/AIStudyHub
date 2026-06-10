import { useState, useEffect } from "react";
import { Search, CheckCircle, Trash2, FileText, RefreshCw } from "lucide-react";

// BR-AM-07: Admin can approve documents, delete violating documents, update document status

const MOCK_DOCS = Array.from({ length: 18 }, (_, i) => ({
  id: `doc${1000 + i}`,
  title: ["Giáo trình Toán Cao Cấp", "Bài Giảng Vật Lý", "Tài liệu Hóa Học", "Đề Cương Lập Trình", "Giáo Trình AI"][i % 5],
  uploader: `user${100 + (i % 8)}`,
  uploadedAt: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString("vi-VN"),
  size: `${(1.2 + i * 0.4).toFixed(1)} MB`,
  status: ["pending", "approved", "rejected", "pending", "approved"][i % 5],
}));

const STATUS_STYLE = {
  pending:  { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  approved: { bg: "#d1fae5", color: "#065f46", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

const PAGE_SIZE = 8;

export default function AdminDocumentManagement() {
  const [docs, setDocs]       = useState([]);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast]     = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5000/api/admin/documents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setDocs(Array.isArray(data) ? data : MOCK_DOCS);
        setLoading(false);
      })
      .catch(() => {
        setDocs(MOCK_DOCS);
        setLoading(false);
      });
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3500);
  };

  const logAction = (action, doc) => {
    fetch("http://localhost:5000/api/admin/log", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, targetDocId: doc.document_id || doc.id, targetTitle: doc.title }),
    }).catch(() => {});
  };

  // BR-AM-07: Approve document
  const handleApprove = async (doc) => {
    try {
      await fetch(`http://localhost:5000/api/admin/documents/${doc.document_id || doc.id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      logAction("APPROVE_DOCUMENT", doc);
    } catch (_) {}
    setDocs(prev => prev.map(d => (d.document_id || d.id) === (doc.document_id || doc.id) ? { ...d, status: "approved" } : d));
    showToast("success", `Đã duyệt tài liệu: ${doc.title}`);
    setConfirm(null);
  };

  // BR-AM-07: Delete document
  const handleDelete = async (doc) => {
    try {
      await fetch(`http://localhost:5000/api/admin/documents/${doc.document_id || doc.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      logAction("DELETE_DOCUMENT", doc);
    } catch (_) {}
    setDocs(prev => prev.filter(d => (d.document_id || d.id) !== (doc.document_id || doc.id)));
    showToast("error", `Đã xóa tài liệu: ${doc.title}`);
    setConfirm(null);
  };

  // BR-AM-07: Update status
  const handleReject = async (doc) => {
    try {
      await fetch(`http://localhost:5000/api/admin/documents/${doc.document_id || doc.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "rejected" }),
      });
      logAction("REJECT_DOCUMENT", doc);
    } catch (_) {}
    setDocs(prev => prev.map(d => (d.document_id || d.id) === (doc.document_id || doc.id) ? { ...d, status: "rejected" } : d));
    showToast("info", `Đã từ chối tài liệu: ${doc.title}`);
    setConfirm(null);
  };

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    return !q || d.title?.toLowerCase().includes(q) || d.uploader?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="adm-page-header">
        <h1 className="adm-page-title">Document Management</h1>
        <p className="adm-page-subtitle">{filtered.length} documents total</p>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-header">
          <span className="adm-table-title">All Documents</span>
          <div className="adm-table-actions">
            <div className="adm-search-wrap">
              <Search className="adm-search-icon" />
              <input
                id="adm-doc-search"
                type="text"
                className="adm-search-input"
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text" style={{ color: "#a78bfa" }}>Loading...</div></div>
        ) : paginated.length === 0 ? (
          <div className="adm-empty">
            <FileText className="adm-empty-icon" />
            <div className="adm-empty-text">No documents found</div>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Doc ID</th>
                <th>Title</th>
                <th>Uploader</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(doc => {
                const st = STATUS_STYLE[doc.status] || STATUS_STYLE.pending;
                return (
                  <tr key={doc.document_id || doc.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>{doc.document_id || doc.id}</td>
                    <td style={{ fontWeight: 600, maxWidth: 220 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.title}
                      </div>
                    </td>
                    <td style={{ color: "#6b7280" }}>{doc.uploader}</td>
                    <td style={{ color: "#6b7280" }}>{doc.size}</td>
                    <td style={{ color: "#9ca3af", fontSize: 12 }}>{doc.uploadedAt}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: st.bg, color: st.color,
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="adm-action-group">
                        {doc.status === "pending" && (
                          <button
                            id={`adm-approve-doc-${doc.document_id || doc.id}`}
                            className="adm-action-btn approve"
                            onClick={() => setConfirm({ action: "approve", doc })}
                          >
                            <CheckCircle size={11} /> Duyệt
                          </button>
                        )}
                        {doc.status === "pending" && (
                          <button
                            id={`adm-reject-doc-${doc.document_id || doc.id}`}
                            className="adm-action-btn"
                            onClick={() => setConfirm({ action: "reject", doc })}
                          >
                            <RefreshCw size={11} /> Từ chối
                          </button>
                        )}
                        <button
                          id={`adm-delete-doc-${doc.document_id || doc.id}`}
                          className="adm-action-btn delete"
                          onClick={() => setConfirm({ action: "delete", doc })}
                        >
                          <Trash2 size={11} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="adm-pagination">
            <span className="adm-pagination-info">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="adm-pagination-btns">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={`adm-page-btn${page === i + 1 ? " active" : ""}`} onClick={() => setPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="adm-overlay" onClick={() => setConfirm(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">
              {confirm.action === "approve" && "Duyệt tài liệu"}
              {confirm.action === "reject"  && "Từ chối tài liệu"}
              {confirm.action === "delete"  && "Xóa tài liệu vi phạm"}
            </div>
            <div className="adm-modal-body">
              {confirm.action === "approve" && <>Duyệt tài liệu "<strong>{confirm.doc.title}</strong>"?</>}
              {confirm.action === "reject"  && <>Từ chối và ẩn tài liệu "<strong>{confirm.doc.title}</strong>"?</>}
              {confirm.action === "delete"  && <>Xóa vĩnh viễn tài liệu "<strong>{confirm.doc.title}</strong>" vi phạm quy định?</>}
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn-cancel" onClick={() => setConfirm(null)}>Hủy</button>
              <button
                id="adm-doc-confirm-btn"
                className={`adm-btn-confirm${confirm.action === "delete" ? " danger" : ""}`}
                onClick={() => {
                  if (confirm.action === "approve") handleApprove(confirm.doc);
                  if (confirm.action === "reject")  handleReject(confirm.doc);
                  if (confirm.action === "delete")  handleDelete(confirm.doc);
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`adm-toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
