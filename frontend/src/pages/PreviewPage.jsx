import React, { useEffect, useState } from "react";
import { API_URL } from "@/config/api.js";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import ShareDocumentModal from "../components/ShareDocumentModal";

export default function PreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null); // 'sending', 'success', 'error'
  const [showShareModal, setShowShareModal] = useState(false);

  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const currentUserId = user?.user_id;

  const fetchDoc = async () => {
    try {
      setLoading(true);
      setError("");
      setIsRestricted(false);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/documents/${id}`, {
        headers
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setIsRestricted(true);
          setLoading(false);
          return;
        }
        if (res.status === 404) {
          throw new Error("Không tìm thấy tài liệu.");
        }
        throw new Error("Lỗi tải tài liệu.");
      }

      const data = await res.json();
      // Backend returns { document: {...} } — unwrap it
      setDoc(data.document || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDoc();
    }
  }, [id]);

  const handleRequestAccess = async () => {
    try {
      setRequestStatus("sending");
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        toast.error("Bạn cần đăng nhập để yêu cầu quyền truy cập.");
        setRequestStatus(null);
        return;
      }

      const res = await fetch(`${API_URL}/api/notifications/request-access/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gửi yêu cầu truy cập thất bại.");
      }

      setRequestStatus("success");
      toast.success(data.message || "Gửi yêu cầu truy cập thành công!");
    } catch (err) {
      toast.error(err.message);
      setRequestStatus("error");
    }
  };

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

  if (isRestricted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-purple-105/50 bg-purple-100 text-purple-605 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Quyền truy cập bị hạn chế</h1>
          <p className="text-slate-500 mb-6">Tài liệu này là riêng tư. Bạn cần gửi yêu cầu truy cập đến chủ sở hữu để xem.</p>
          
          {requestStatus === "success" ? (
            <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-2xl mb-6 border border-emerald-100 animate-in fade-in duration-200">
              Yêu cầu truy cập đã được gửi. Đang chờ phê duyệt từ chủ sở hữu.
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {requestStatus !== "success" && (
              <button 
                onClick={handleRequestAccess}
                disabled={requestStatus === "sending"}
                className="w-full px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-purple-500/10 active:scale-95 flex items-center justify-center gap-2"
              >
                {requestStatus === "sending" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  "Yêu cầu quyền truy cập"
                )}
              </button>
            )}
            <button 
              onClick={() => navigate("/")}
              className="w-full px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Quay về trang chủ
            </button>
          </div>
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
          doc={{ ...doc, hideChat: true }} 
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
