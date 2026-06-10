import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import ShareDocumentModal from "../components/ShareDocumentModal";

export default function PreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const currentUserId = user?.user_id;

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`http://localhost:5000/api/documents/${id}`, {
          headers
        });

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Tài liệu này là riêng tư (Private). Bạn không có quyền truy cập.");
          }
          if (res.status === 404) {
            throw new Error("Không tìm thấy tài liệu.");
          }
          throw new Error("Lỗi tải tài liệu.");
        }

        const data = await res.json();
        setDoc(data.document);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDoc();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
          <span className="text-slate-500 font-medium animate-pulse">Đang tải tài liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Lỗi truy cập</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
          >
            Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900/10">
      {doc && (
        <DocumentPreviewModal 
          doc={doc} 
          currentUserId={currentUserId}
          onShare={() => setShowShareModal(true)}
          onClose={() => navigate("/")} 
        />
      )}
      {showShareModal && doc && (
        <ShareDocumentModal
          documentId={doc.document_id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
