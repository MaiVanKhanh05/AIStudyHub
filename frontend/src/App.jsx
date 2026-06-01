import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import Home from "./components/Home";
import DocumentList from "./pages/DocumentList";
import Login from "./pages/Authentication/LoginPage";
import Register from "./pages/Authentication/RegisterPage";
import ForgotPassword from "./pages/Authentication/ForgotPasswordPage";
import ResetPassword from "./pages/Authentication/ResetPasswordPage";
import OAuthCallback from "./pages/Authentication/OAuthCallbackPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Home as HomeIcon, User as UserIcon, BookOpen, FolderOpen } from "lucide-react";


function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = ["/login", "/register", "/forgot-password", "/reset-password", "/", "/oauth-callback"].includes(location.pathname) || location.pathname.startsWith("/admin");

  // Retrieve user session
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    // Purge local storage and session storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    // Redirect to login page
    navigate("/login");
  };

  return (
    <>
      {!hideNav && (
        <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 select-none">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-base font-extrabold text-purple-800 dark:text-purple-300 uppercase tracking-widest">
              <BookOpen className="w-5 h-5 text-purple-600" />
              AIStudyHub
            </Link>
            <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              <HomeIcon className="w-4 h-4" />
              Home
            </Link>
            <Link to="/documents" className="flex items-center gap-1.5 text-sm font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              <FolderOpen className="w-4 h-4 text-purple-600" />
              Documents
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {token ? (
              <>
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <UserIcon className="w-4 h-4 text-purple-500/80" />
                  Hi, <span className="text-foreground font-semibold">{user?.full_name || user?.email}</span>
                </span>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-8 gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="text-sm font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/documents" element={<DocumentList />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
