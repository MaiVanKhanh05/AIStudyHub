import { useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminOverview from "./AdminOverview";
import AdminUserManagement from "./AdminUserManagement";
import AdminDocumentManagement from "./AdminDocumentManagement";
import AdminTopicManagement from "./AdminTopicManagement";
import AdminStorageManagement from "./AdminStorageManagement";
import AdminPersonalProfile from "./AdminPersonalProfile";

// BR-AM-01 & BR-AM-02: Chỉ admin mới được truy cập
export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AdminSidebar />
      <main className="flex-1 min-w-0 p-7 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="topics" element={<AdminTopicManagement />} />
          <Route path="storage" element={<AdminStorageManagement />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="profile" element={<AdminPersonalProfile />} />
          <Route path="documents" element={<AdminDocumentManagement />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
