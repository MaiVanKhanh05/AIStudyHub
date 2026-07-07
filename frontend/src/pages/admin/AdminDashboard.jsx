import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const [activeSection, setActiveSection] = useState("dashboard");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const handleNavigate = (section, filter = "all") => {
    setActiveSection(section);
    if (section === "users") setUserRoleFilter(filter);
  };

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
      case "dashboard":  return <AdminOverview onNavigate={handleNavigate} />;
      case "topics":     return <AdminTopicManagement />;
      case "storage":    return <AdminStorageManagement />;
      case "users":      return <AdminUserManagement roleFilter={userRoleFilter} />;
      case "profile":    return <AdminPersonalProfile />;
      case "documents":  return <AdminDocumentManagement />;
      default:           return <AdminOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AdminSidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <main className="flex-1 min-w-0 p-7 overflow-x-hidden">
        {renderSection()}
      </main>
    </div>
  );
}
