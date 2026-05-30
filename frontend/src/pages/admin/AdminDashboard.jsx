import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminOverview from "./AdminOverview";
import AdminUserManagement from "./AdminUserManagement";
import AdminDocumentManagement from "./AdminDocumentManagement";
import AdminStorageManagement from "./AdminStorageManagement";
import AdminPersonalProfile from "./AdminPersonalProfile";

// BR-AM-01 & BR-AM-02: Chỉ admin mới được truy cập
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");

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

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":  return <AdminOverview />;
      case "student":    return <AdminUserManagement roleFilter="STUDENT" />;
      case "lecture":    return <AdminUserManagement roleFilter="LECTURER" />;
      case "storage":    return <AdminStorageManagement />;
      case "users":      return <AdminUserManagement roleFilter="all" />;
      case "profile":    return <AdminPersonalProfile />;
      case "documents":  return <AdminDocumentManagement />;
      default:           return <AdminOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AdminSidebar activeSection={activeSection} onNavigate={setActiveSection} />
      <main className="flex-1 min-w-0 p-7 overflow-x-hidden">
        {renderSection()}
      </main>
    </div>
  );
}
