import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home as HomeIcon,
  FolderOpen,
  Bot,
  Share2,
  Bell,
  User as UserIcon,
  Plus,
  Cloud,
  Settings,
  Search,
  ArrowUpRight,
  Download,
  ChevronDown,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  FileCode,
  File,
  MoreHorizontal,
  LogOut,
  Paperclip,
  Send,
  UploadCloud,
  Trash2,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Calendar,
  BookOpen,
  HelpCircle,
  Globe,
  Lock,
  Tag,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFileToSupabase, deleteFileFromSupabase } from "../lib/supabase";
import axios from "axios";
import { toast } from "sonner";
import DocumentPreviewModal from "./DocumentPreviewModal";
import DocumentCard from "./DocumentCard";
import { getSimulatedContent } from "../utils/documentUtils";
import SearchBar from "./SearchBar";
import Pagination from "./Pagination";

function getFileIcon(fileType = "", className = "w-5 h-5") {
  const type = fileType.toLowerCase();
  if (type === "pdf") return <FileText className={`${className} text-red-500 dark:text-red-400`} />;
  if (["doc", "docx"].includes(type)) return <FileText className={`${className} text-blue-500 dark:text-blue-400`} />;
  if (["xls", "xlsx", "excel"].includes(type)) return <FileSpreadsheet className={`${className} text-emerald-500 dark:text-emerald-400`} />;
  if (["ppt", "pptx", "powerpoint"].includes(type)) return <Presentation className={`${className} text-orange-500 dark:text-orange-400`} />;
  if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) return <FileImage className={`${className} text-indigo-500 dark:text-indigo-400`} />;
  if (["txt", "code", "js", "html", "css"].includes(type)) return <FileCode className={`${className} text-purple-500 dark:text-purple-400`} />;
  return <File className={`${className} text-slate-500 dark:text-slate-400`} />;
}

function getFileType(url = "") {
  if (!url) return "PDF";
  const ext = url.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (ext === "txt") return "txt";
  return "other";
}

export default function Home() {
  const navigate = useNavigate();
  const isUploadingRef = useRef(false);

  // Load authenticated user session
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const fullName = user?.first_name ? `${user.last_name} ${user.first_name}`.trim() : (user?.email || "Học Viên AIStudyHub");

  // Extract first name or display name
  const nameParts = fullName.trim().split(" ");
  const displayGreetingName = nameParts.length > 1
    ? nameParts.slice(-2).join(" ")
    : fullName;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState("Home");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // States for dynamic documents and storage usage
  const [documents, setDocuments] = useState([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");

  // Community Tab States & Dynamic Data Loader
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPage, setCommunityPage] = useState(1);
  const [communityDocs, setCommunityDocs] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  const fetchCommunityDocs = async () => {
    setCommunityLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/documents/community", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityDocs(data);
      }
    } catch (err) {
      console.error("Error fetching community documents:", err);
    } finally {
      setCommunityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Community") {
      fetchCommunityDocs();
    }
  }, [activeTab]);

  useEffect(() => {
    setCommunityPage(1);
  }, [communitySearch]);

  const handleToggleCommunityPin = (id) => {
    setCommunityDocs((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === id ? { ...doc, isPinned: !doc.isPinned } : doc
      )
    );
  };

  const filteredCommunityDocs = communityDocs.filter((doc) => {
    if (!communitySearch) return true;
    const keyword = communitySearch.toLowerCase().trim();
    return (
      (doc.title && doc.title.toLowerCase().includes(keyword)) ||
      (doc.subject && doc.subject.toLowerCase().includes(keyword)) ||
      (doc.author && doc.author.toLowerCase().includes(keyword))
    );
  });

  const COMMUNITY_PAGE_SIZE = 9;
  const communityTotalPages = Math.max(1, Math.ceil(filteredCommunityDocs.length / COMMUNITY_PAGE_SIZE));
  const currentCommunityDocs = filteredCommunityDocs.slice(
    (communityPage - 1) * COMMUNITY_PAGE_SIZE,
    communityPage * COMMUNITY_PAGE_SIZE
  );

  const pinnedCommunityDocs = currentCommunityDocs.filter((doc) => doc.isPinned);
  const regularCommunityDocs = currentCommunityDocs.filter((doc) => !doc.isPinned);

  // Document Management Tab States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Chọn môn học");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "upload_date", direction: "desc" });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [shareModalDoc, setShareModalDoc] = useState(null);
  const [shareDescription, setShareDescription] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!showSortMenu) return;
    const closeMenu = () => setShowSortMenu(false);
    const timeoutId = setTimeout(() => window.addEventListener("click", closeMenu), 0);
    return () => { clearTimeout(timeoutId); window.removeEventListener("click", closeMenu); };
  }, [showSortMenu]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    const timeoutId = setTimeout(() => window.addEventListener("click", closeMenu), 0);
    return () => { clearTimeout(timeoutId); window.removeEventListener("click", closeMenu); };
  }, [openMenuId]);

  // Searchable subjects list
  const [subjectsList, setSubjectsList] = useState([]);
  const [subjectSearchInput, setSubjectSearchInput] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // Real File Upload & Tag Editor States
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTags, setDocumentTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState(null);
  const [duplicateConfirmData, setDuplicateConfirmData] = useState(null);

  // AI Assistant Chatbot States
  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: `Xin chào ${displayGreetingName}. Tôi là Trợ lý Nghiên cứu & Học tập AI của bạn. Bạn muốn tôi giúp tóm tắt học liệu, phân tích mã nguồn hay giải đáp kiến thức học thuật nào hôm nay?`
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [useCopilotMode, setUseCopilotMode] = useState(true);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // Get current formatted date
  useEffect(() => {
    const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
    setCurrentDate(new Date().toLocaleDateString("vi-VN", options));
  }, []);

  // Fetch dashboard data
  const fetchDashboard = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/documents/dashboard?userId=${user.user_id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setDocuments(response.data.documents || []);
      setStorageUsage(response.data.storageUsage || 0);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Không thể tải dữ liệu kho học liệu cá nhân.");
    } finally {
      setLoading(false);
    }
  };

  // Handle preview document with simulated content
  const handlePreviewClick = (doc) => {
    const docWithContent = {
      ...doc,
      simulated_content: getSimulatedContent(doc.title || doc.document_name || "", doc.subject || "")
    };
    setPreviewDoc(docWithContent);
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchDashboard();
  }, [user?.user_id, navigate]);

  // Fetch all subjects from database on mount for searching and selecting
  useEffect(() => {
    if (!user) return;
    const loadSubjects = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/subjects", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = response.data;
        setSubjectsList(data);
        // Set initial subject default if available
        if (data.length > 0 && !uploadSubject) {
          setUploadSubject(data[0].subject_code);
        }
      } catch (error) {
        console.error("Error loading subjects:", error);
        toast.error("Lỗi khi tải danh sách học phần.");
      }
    };
    loadSubjects();
  }, []);

  // Fetch subject-specific tags whenever the selected subject changes
  useEffect(() => {
    if (!user) return;
    const loadSubjectTags = async () => {
      if (!uploadSubject) return;
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(`http://localhost:5000/api/tags/subject/${uploadSubject}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = response.data;
        const tagNames = data.map(t => t.tag_name);
        setDocumentTags([]); // Initially empty - tags only selected via dropdown
        setSuggestedTags(tagNames);
      } catch (error) {
        console.error("Error loading subject tags:", error);
        toast.error("Lỗi khi tải gợi ý tag của môn học.");
      }
    };
    loadSubjectTags();
  }, [uploadSubject]);

  // Handle searching database for matching tags
  const handleTagSearch = async (val) => {
    setTagSearchInput(val);
    if (!val.trim()) {
      setSearchSuggestions([]);
      return;
    }
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/tags/search?q=${val.trim()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = response.data;
      setSearchSuggestions(data.map(t => t.tag_name));
    } catch (error) {
      console.error("Error searching tags:", error);
    }
  };

  const handleAddTag = (tagName) => {
    const cleanTag = tagName.trim().replace(/\s+/g, "_"); // standardize tags as snake_case or clean string
    if (cleanTag && !documentTags.includes(cleanTag)) {
      setDocumentTags([...documentTags, cleanTag]);
    }
    setTagSearchInput("");
    setSearchSuggestions([]);
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagName) => {
    setDocumentTags(documentTags.filter(t => t !== tagName));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  // Real Database Document Deletion Confirmation trigger
  const handleDeleteDocument = (docId, e) => {
    e.stopPropagation();
    setDeleteConfirmDocId(docId);
  };

  // Real Database Document Deletion execution
  const handleDeleteDocumentConfirmed = async (docId) => {
    // Retrieve target document to obtain file_url
    const docToDelete = documents.find(d => d.document_id === docId);

    try {
      // 1. Delete the file from Supabase Storage if file_url is present
      if (docToDelete && docToDelete.file_url) {
        try {
          const urlParts = docToDelete.file_url.split("/AIStudyHub/");
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1]);
            const storageResult = await deleteFileFromSupabase(filePath, "AIStudyHub");
            if (!storageResult.success) {
              console.warn("Could not delete from Supabase storage:", storageResult.error);
            }
          }
        } catch (storageErr) {
          console.error("Storage deletion error:", storageErr);
        }
      }

      // 2. Delete the record from PostgreSQL database via backend API
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/documents/${docId}?userId=${user.user_id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      toast.success("Đã xóa tài liệu thành công khỏi hệ thống!");
      // Refresh dashboard to pull exact database records
      await fetchDashboard();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Đã xảy ra lỗi khi kết nối tới server để xóa tài liệu.";
      toast.error(errMsg);
    }
  };

  // Real Database Document Upload Action (utilizing Supabase Storage & Title Unique Checker)
  const handleRealUpload = async (e, forceProceed = false, uploadParams = null) => {
    if (e) e.preventDefault();
    if (isUploadingRef.current) return;

    if (!uploadTitle.trim()) {
      toast.warning("Vui lòng điền tiêu đề tài liệu!");
      return;
    }
    if (!selectedFile) {
      toast.warning("Vui lòng chọn một tệp để tải lên!");
      return;
    }

    let fileToUpload = uploadParams?.fileToUpload || selectedFile;
    let finalTitle = uploadParams?.finalTitle || uploadTitle.trim();

    if (!forceProceed) {
      const isDuplicateFile = documents.some(doc => {
        if (!doc.file_url) return false;
        const decodedUrl = decodeURIComponent(doc.file_url);
        return decodedUrl.endsWith(`/${selectedFile.name}`);
      });

      const isDuplicateTitle = documents.some(doc => doc.title.toLowerCase() === finalTitle.toLowerCase());

      if (isDuplicateFile || isDuplicateTitle) {
        setDuplicateConfirmData({
          isFileDuplicate: isDuplicateFile,
          isTitleDuplicate: isDuplicateTitle,
          file: selectedFile,
          title: finalTitle
        });
        return;
      }
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload to Supabase Storage
      setUploadProgress(40);
      const uploadResult = await uploadFileToSupabase(fileToUpload, "AIStudyHub", user.user_id);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Lỗi khi tải tệp lên Supabase Storage.");
      }

      setUploadProgress(80);

      // 2. Save metadata to backend API
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.post("http://localhost:5000/api/documents/upload", {
        user_id: user.user_id,
        subject: uploadSubject || null,
        title: finalTitle,
        description: uploadSubject
          ? `Tài liệu môn ${uploadSubject} tự tải lên lưu trữ trên hệ thống`
          : "Tài liệu tự do tự tải lên lưu trữ trên hệ thống",
        file_url: uploadResult.fileUrl,
        file_size: fileToUpload.size,
        file_type: fileToUpload.name.split(".").pop().toUpperCase(),
        visibility: "PRIVATE",
        tags: documentTags // Pass selected tags array!
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      setUploadProgress(95);

      const savedData = response.data;
      setUploadProgress(100);

      setTimeout(async () => {
        setIsUploading(false);
        isUploadingRef.current = false;
        setUploadTitle("");
        setSelectedFile(null);
        setDocumentTags([]);
        // Refresh list
        await fetchDashboard();

        const wasRenamed = savedData.document.title !== finalTitle;
        if (wasRenamed) {
          toast.success("Tải lên tài liệu thành công!");
          toast.warning(`⚠️ Tên tài liệu tự động đổi thành: "${savedData.document.title}" do trùng lặp!`, {
            duration: 6000
          });
        } else {
          toast.success("Tải lên tài liệu thành công!");
        }
      }, 300);
    } catch (err) {
      setIsUploading(false);
      isUploadingRef.current = false;
      setUploadProgress(0);
      console.error("Upload failed with error details:", err);
      const errMsg = err.response?.data?.error || err.message || "Tải lên tệp không thành công.";
      toast.error(`Lỗi tải lên: ${errMsg}`);
    }
  };

  // Send AI Chat Message action
  const handleSendChatMessage = (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: text
    };
    setAiMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");

    setIsAiTyping(true);

    // Simulate AI response based on keywords
    setTimeout(() => {
      let aiText = "Tôi đã tiếp nhận câu hỏi nghiên cứu của bạn. Hệ thống AI đang truy vấn tài liệu môn học liên quan để cung cấp câu trả lời học thuật chuẩn xác nhất.";

      const query = text.toLowerCase();
      if (query.includes("dijkstra")) {
        aiText = "Thuật toán Dijkstra (nhà toán học Edsger W. Dijkstra phát minh năm 1956) là thuật toán kinh điển tìm đường đi ngắn nhất từ một đỉnh nguồn đến tất cả các đỉnh khác trong đồ thị có trọng số không âm. Ổn định ở độ phức tạp O(V^2) hoặc O(E + V log V) khi dùng Fibonacci Heap. Quy trình hoạt động: 1) Khởi tạo khoảng cách d(s)=0, các đỉnh khác vô cùng. 2) Tìm đỉnh u có d(u) nhỏ nhất chưa duyệt. 3) Tối ưu hóa (Relaxation) khoảng cách cho các đỉnh kề v: d(v) = min(d(v), d(u) + w(u,v)). 4) Lặp lại cho tới khi hoàn tất.";
      } else if (query.includes("wed202c") || query.includes("html") || query.includes("css")) {
        aiText = "Trong môn Thiết kế Web học thuật (WED202c), việc tổ chức cấu trúc dữ liệu giao diện cần tuân thủ cấu trúc HTML5 ngữ nghĩa (Semantic HTML) như <header>, <article>, <aside> và <footer> để tối ưu hóa SEO. CSS3 nên sử dụng Grid và Flexbox để căn chỉnh bố cục khoa học, kết hợp với các biến CSS variables (CSS Custom Properties) để kiểm soát màu sắc đồng bộ, nâng cao tính chuyên nghiệp của giao diện.";
      } else if (query.includes("đại số") || query.includes("tuyến tính") || query.includes("vector")) {
        aiText = "Đại số tuyến tính nghiên cứu về không gian vectơ và các phép biến đổi tuyến tính giữa chúng. Trong khoa học AI và học sâu (Deep Learning), các phép tính ma trận (Matrix operations) như Nhân ma trận, Phân tách ma trận (SVD) và tìm Trị riêng / Vectơ riêng (Eigenvalues / Eigenvectors) là xương sống cho việc tối ưu hóa mạng nơ-ron truyền thẳng.";
      }

      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText
        }
      ]);
      setIsAiTyping(false);
    }, 1000);
  };

  const handleSendResetEmail = async () => {
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!user || !user.email) {
      setChangePasswordError("Không tìm thấy địa chỉ email liên kết với tài khoản.");
      return;
    }

    try {
      setResetEmailLoading(true);
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });

      const data = await response.json();

      if (response.ok) {
        setChangePasswordSuccess(`Yêu cầu đặt lại mật khẩu đã được gửi đến email: ${user.email}. Vui lòng kiểm tra hộp thư (và mục thư rác) để hoàn tất cập nhật mật khẩu!`);
      } else {
        setChangePasswordError(data.error || "Gửi email xác thực thất bại.");
      }
    } catch (err) {
      setChangePasswordError("Không thể kết nối đến máy chủ để gửi email xác thực.");
    } finally {
      setResetEmailLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangePasswordError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("Mật khẩu mới và xác nhận mật khẩu không trùng khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }

    try {
      setChangePasswordLoading(true);
      const response = await fetch("http://localhost:5000/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.user_id,
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setChangePasswordSuccess("Mật khẩu học tập của bạn đã được thay đổi thành công!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setChangePasswordError(data.error || "Không thể thay đổi mật khẩu.");
      }
    } catch (err) {
      setChangePasswordError("Không thể kết nối đến máy chủ để thay đổi mật khẩu.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const navItems = [
    { name: "Home", icon: HomeIcon, label: "Tổng quan học tập" },
    { name: "Document Management", icon: FolderOpen, label: "Kho học liệu cá nhân" },
    { name: "AI Assistant", icon: Bot, label: "Trợ lý Nghiên cứu AI" },
    { name: "Community", icon: Users, label: "Cộng đồng" },
    { name: "Notifications", icon: Bell, label: "Thông báo học thuật" },
    { name: "Personal Profile", icon: UserIcon, label: "Hồ sơ & Bảo mật" }
  ];

  // Mock Shared Documents Grid Data
  const sharedDocs = [
    { id: 101, title: "Đề cương toán cao cấp kỳ 1.pdf", subject_code: "MAS291", owner_name: "Lê Minh Tuấn (Bạn học)", upload_date: "2026-05-30T09:12:00Z", file_size: 2457890 },
    { id: 102, title: "Slide hướng dẫn Flexbox nâng cao.pptx", subject_code: "WED202c", owner_name: "GV. Nguyễn Thành Nam", upload_date: "2026-05-29T14:40:00Z", file_size: 8901230 },
    { id: 103, title: "Đề cương ôn tập trắc nghiệm CSI104.docx", subject_code: "CSI104", owner_name: "Hoàng Thị Mai (Bạn học)", upload_date: "2026-05-28T10:15:00Z", file_size: 1560900 }
  ];

  // Mock Study Groups
  const studyGroups = [
    { id: 1, name: "Nhóm nghiên cứu học tập WED202c", subject: "WED202c", members: 14, active: true },
    { id: 2, name: "Nhóm giải đề thi Toán Rời rạc MAS291", subject: "MAS291", members: 8, active: true }
  ];

  // Mock Notifications
  const notificationsList = [
    { id: 1, text: "Giảng viên Nguyễn Thành Nam đã phê duyệt tài liệu học tập mới của bạn.", type: "success", time: "10 phút trước" },
    { id: 2, text: "Đã trích xuất tóm tắt học thuật bằng AI cho tài liệu 'Đề cương ôn tập MAS291.pdf'.", type: "info", time: "1 giờ trước" },
    { id: 3, text: "Xác thực đăng nhập tài khoản qua Google OAuth 2.0 thành công.", type: "success", time: "5 giờ trước" }
  ];

  // Derived variables and format functions
  const recentDocs = documents.slice(0, 3);

  const formatFileSize = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const storageLimit = user?.max_storage_bytes || 2147483648; // default 2GB
  const usageInGB = (storageUsage / (1024 * 1024 * 1024)).toFixed(2);
  const limitInGB = (storageLimit / (1024 * 1024 * 1024)).toFixed(0);
  const percentage = Math.min(100, (storageUsage / storageLimit) * 100);

  // Filters logic for document tab
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === "All" || doc.subject_code === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  }).sort((a, b) => {
    if (sortConfig.key === "upload_date") {
      const dateA = new Date(a.upload_date).getTime();
      const dateB = new Date(b.upload_date).getTime();
      return sortConfig.direction === "desc" ? dateB - dateA : dateA - dateB;
    } else if (sortConfig.key === "file_size") {
      const sizeA = a.file_size || 0;
      const sizeB = b.file_size || 0;
      return sortConfig.direction === "desc" ? sizeB - sizeA : sizeA - sizeB;
    }
    return 0;
  });

  return (
    <div className="flex w-full h-screen overflow-hidden bg-slate-50 dark:bg-[#08090d] text-slate-800 dark:text-slate-100 font-sans relative">
      {/* Gentle Liquid Glass Floating Background Circles */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[55%] rounded-full bg-purple-500/8 dark:bg-purple-550/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-500/4 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] left-[20%] w-[45%] h-[45%] rounded-full bg-purple-500/6 dark:bg-purple-950/15 blur-[150px] pointer-events-none z-0" />

      {/* ── LEFT SIDEBAR (Notion/Perplexity Academic Vibe) ── */}
      <aside className="w-68 h-full bg-white/35 dark:bg-[#0f111a]/40 backdrop-blur-xl border-r border-slate-200/40 dark:border-white/5 flex flex-col p-5 shrink-0 justify-between select-none z-10 shadow-[inset_-1px_0_0_rgba(255,255,255,0.25)] dark:shadow-none">
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar">

          {/* Logo Brand Header */}
          <div className="flex items-center gap-2.5 px-1.5 py-0.5">
            <div className="w-7.5 h-7.5 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center font-bold text-white shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase leading-none">AIStudyHub</span>
              <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mt-0.5">Academic Portal</span>
            </div>
          </div>

          {/* User mini profile card */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/40 dark:border-white/5 bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-md hover:bg-white/65 dark:hover:bg-[#0f111a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 text-left focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8.5 h-8.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center font-extrabold text-purple-700 dark:text-purple-300 shrink-0">
                  {fullName.charAt(0)}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#151722] animate-pulse" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{fullName}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-none mt-1">Học viên</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1 bg-white/85 dark:bg-[#0f111a]/90 backdrop-blur-lg border border-slate-200/40 dark:border-white/10 rounded-xl shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setActiveTab("Personal Profile");
                    setShowProfileDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4" />
                  Hồ sơ cá nhân
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-350 cursor-pointer select-none focus:outline-none ${isActive
                    ? "bg-purple-600/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-purple-500/20"
                    : "text-slate-500 dark:text-slate-400 border border-transparent hover:bg-white/40 dark:hover:bg-[#0f111a]/30 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>




        </div>

        {/* Sidebar Footer with Clean Storage Overview */}
        <div className="flex flex-col gap-4">
          <div className="p-3.5 bg-white/30 dark:bg-[#0f111a]/35 border border-slate-200/40 dark:border-white/5 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Không gian học thuật</span>
                <span className="text-[10px] font-bold">{percentage.toFixed(0)}%</span>
              </div>

              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold text-right">
                {usageInGB} GB / {limitInGB} GB
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("Personal Profile")}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-[#0f111a]/30 rounded-lg cursor-pointer border border-transparent hover:border-slate-200/20 dark:hover:border-white/5 transition-all focus:outline-none"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Cài đặt & Bảo mật
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col p-6 md:p-8 gap-6 bg-transparent z-10">

        {/* ── SCREEN 1: HOME (DASHBOARD) ── */}
        {activeTab === "Home" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">

            {/* Top Minimal Greeting Header */}
            <header className="flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none">
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5" />
                <span>{currentDate}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight leading-none">
                    Chào {displayGreetingName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Chào mừng bạn quay lại AIStudyHub. Hệ thống lưu trữ học tập đã sẵn sàng.</p>
                </div>
                <Button
                  onClick={() => setActiveTab("AI Assistant")}
                  className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Trợ lý học tập AI
                </Button>
              </div>
            </header>

            {/* Academic Search Interface (Perplexity style) */}
            <div className="w-full max-w-2xl mx-auto relative select-none mt-2">
              <div className="relative p-1 rounded-xl bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-sm">
                <Input
                  type="text"
                  placeholder="Tra cứu tài liệu, khái niệm học thuật, giải thích thuật toán..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-white/80 dark:bg-[#0c0d13]/80 border-none pl-5 pr-12 py-5.5 text-xs placeholder:text-slate-400 text-slate-800 dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-purple-500/50"
                />
                <button
                  onClick={() => setActiveTab("Document Management")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section: Recent Academic Materials */}
            <section className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-purple-800 dark:bg-purple-400 rounded" />
                  Học liệu đã lưu trữ gần đây
                </h2>
                <button
                  onClick={() => setActiveTab("Document Management")}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-0.5 hover:underline"
                >
                  Xem kho tài liệu
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {loading ? (
                  Array(3).fill(0).map((_, idx) => (
                    <Card key={idx} className="bg-slate-50 dark:bg-[#151722] border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 animate-pulse shadow-none">
                      <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    </Card>
                  ))
                ) : recentDocs.length === 0 ? (
                  <div className="col-span-full py-10 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs font-bold text-slate-400">
                    Chưa tải học liệu nào lên. Vào phần "Kho học liệu cá nhân" để lưu trữ tệp của bạn.
                  </div>
                ) : (
                  recentDocs.map((doc) => (
                    <Card
                      key={doc.document_id}
                      onClick={() => setActiveTab("Document Management")}
                      className="liquid-glass liquid-glass-hover rounded-xl p-4 flex flex-col gap-3 cursor-pointer group shadow-sm"
                    >
                      <div className="w-full h-24 rounded-lg bg-slate-50 dark:bg-[#0c0d13] p-3 flex flex-col justify-between border border-slate-100 dark:border-slate-800/40">
                        <span className="text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/10 self-start">
                          {doc.subject_code}
                        </span>

                        <div className="flex items-center gap-2 opacity-80">
                          {getFileIcon(doc.file_type || getFileType(doc.file_url), "w-5 h-5")}
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 tracking-widest uppercase">{doc.file_type || getFileType(doc.file_url) || "PDF"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-purple-600 transition-colors truncate">
                          {doc.title}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>{new Date(doc.upload_date).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>

            {/* Asymmetric Bento Academic Widgets */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">


              {/* Box 2: System notifications */}
              <Card className="liquid-glass rounded-xl p-5 flex flex-col gap-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                  <span className="flex items-center gap-2"><Bell className="w-4 h-4 text-purple-500" /> Báo cáo trạng thái AI</span>
                  <button onClick={() => setActiveTab("Notifications")} className="text-[10px] text-purple-600 font-bold hover:underline">Lịch sử hoạt động</button>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 animate-pulse" />
                    <span className="truncate">AI đã xử lý trích xuất tóm tắt môn Toán Rời Rạc hoàn tất.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                    <span className="truncate">Giảng viên đã duyệt bộ học liệu WED202c cá nhân của bạn.</span>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}

        {/* ── SCREEN 2: DOCUMENT MANAGEMENT (Real On-Storage Upload) ── */}
        {activeTab === "Document Management" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Bộ lưu trữ của bạn</span>
              <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
                Kho học liệu cá nhân (On-Storage)
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Mọi tài liệu tải lên sẽ được ghi nhận và lưu trữ trực tiếp vào cơ sở dữ liệu hệ thống.
              </span>
            </header>

            {/* Academic Styled Dropzone for Real File Upload */}
            <Card className="liquid-glass rounded-xl p-5 shadow-sm">
              <form onSubmit={handleRealUpload} className="flex flex-col gap-5">

                {/* File Upload Row */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tệp tài liệu học tập *</label>

                  {!selectedFile ? (
                    <div
                      onClick={() => document.getElementById("file-picker-input").click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-300 group"
                    >
                      <input
                        id="file-picker-input"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col items-center gap-1.5">
                        <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-purple-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Kéo thả tệp hoặc nhấp để chọn tệp tài liệu</span>
                        <span className="text-[10px] text-slate-400">PDF, PowerPoint, Word, Excel, TXT (Tối đa 10MB)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 bg-slate-100/65 dark:bg-[#0c0d13]/65 border border-slate-200/50 dark:border-slate-800/80 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{selectedFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setUploadTitle(""); }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-450 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Title input */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tiêu đề học liệu *</label>
                    <Input
                      type="text"
                      placeholder="Ví dụ: Đề cương tự ôn thi cuối học kỳ"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={isUploading}
                      className="bg-white dark:bg-[#0c0d13] border-slate-200 dark:border-slate-800 rounded-lg px-4 py-5 text-xs placeholder:text-slate-450 focus-visible:ring-1 focus-visible:ring-purple-500 font-semibold"
                    />
                  </div>

                  {/* Searchable Subject selector */}
                  <div
                    className="flex flex-col gap-1.5 relative"
                    onMouseLeave={() => setShowSubjectDropdown(false)}
                  >
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Chọn học phần</label>
                    <div
                      onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                      className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus-within:ring-1 focus-within:ring-purple-500 font-bold cursor-pointer h-10 flex items-center justify-between select-none"
                    >
                      <span className="truncate pr-2">
                        {uploadSubject
                          ? `${uploadSubject} - ${subjectsList.find(s => s.subject_code === uploadSubject)?.subject_name || "Môn học"}`
                          : "Không chọn học phần (Để trống)"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>

                    {showSubjectDropdown && (
                      <div className="absolute top-[100%] left-0 right-0 mt-0.0 max-h-60 overflow-y-auto bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 flex flex-col gap-2">
                        {/* Subject search input */}
                        <Input
                          type="text"
                          placeholder="Tìm học phần..."
                          value={subjectSearchInput}
                          onChange={(e) => setSubjectSearchInput(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // prevent closing panel
                          className="bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] placeholder:text-slate-450 h-8"
                        />
                        <div className="flex flex-col max-h-36 overflow-y-auto custom-scrollbar gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadSubject("");
                              setSubjectSearchInput("");
                              setShowSubjectDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-1 ${!uploadSubject
                              ? "bg-purple-600/10 text-purple-650 dark:text-purple-400"
                              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                          >
                            <span>-- Không chọn học phần (Để trống) --</span>
                          </button>
                          {subjectsList.filter(sub =>
                            sub.subject_code.toLowerCase().includes(subjectSearchInput.toLowerCase()) ||
                            sub.subject_name.toLowerCase().includes(subjectSearchInput.toLowerCase())
                          ).length === 0 ? (
                            <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">Không tìm thấy học phần</span>
                          ) : (
                            subjectsList
                              .filter(sub =>
                                sub.subject_code.toLowerCase().includes(subjectSearchInput.toLowerCase()) ||
                                sub.subject_name.toLowerCase().includes(subjectSearchInput.toLowerCase())
                              )
                              .map(sub => (
                                <button
                                  key={sub.subject_code}
                                  type="button"
                                  onClick={() => {
                                    setUploadSubject(sub.subject_code);
                                    setSubjectSearchInput("");
                                    setShowSubjectDropdown(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-between ${uploadSubject === sub.subject_code
                                    ? "bg-purple-600/10 text-purple-600 dark:text-purple-400"
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                >
                                  <span className="truncate">{sub.subject_code} ({sub.subject_name})</span>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tag Editor Component */}
                <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/50 pt-4 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-purple-500" />
                      Gắn thẻ học liệu (Tags)
                    </label>
                    <span className="text-[9px] text-slate-400 font-bold">Thêm nhiều tag để dễ tìm kiếm</span>
                  </div>

                  {/* Active Tags list */}
                  <div className="flex flex-wrap gap-1.5">
                    {documentTags.length === 0 ? (
                      <span className="text-[11px] text-slate-400 font-bold italic py-1">Chưa chọn tag nào cho tài liệu</span>
                    ) : (
                      documentTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/45 border border-purple-500/20 dark:border-purple-400/20 rounded-full animate-in fade-in duration-100"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Search & Selection Dropdown */}
                  <div className="flex flex-col gap-1.5 relative mt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tìm kiếm & chọn tag học tập</span>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Nhấn để xem gợi ý hoặc tìm kiếm tag..."
                        value={tagSearchInput}
                        onChange={(e) => handleTagSearch(e.target.value)}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 250)} // delay to allow clicks
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (tagSearchInput.trim()) {
                              handleAddTag(tagSearchInput);
                            }
                          }
                        }}
                        className="bg-white dark:bg-[#0c0d13] border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs placeholder:text-slate-450 h-9"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (tagSearchInput.trim()) {
                            handleAddTag(tagSearchInput);
                          }
                        }}
                        className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white text-xs font-bold px-3 h-9 shrink-0 cursor-pointer rounded-lg shadow-sm"
                      >
                        Thêm
                      </Button>
                    </div>

                    {/* Floating Dropdown Suggestions */}
                    {showTagSuggestions && (
                      <div className="absolute bottom-[100%] left-0 right-0 mb-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1">
                        {tagSearchInput.trim() ? (
                          /* Search Suggestions from DB */
                          searchSuggestions.filter(t => !documentTags.includes(t)).length === 0 ? (
                            <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">
                              Không tìm thấy tag trùng khớp. Nhấn "Thêm" để tạo mới.
                            </span>
                          ) : (
                            searchSuggestions.filter(t => !documentTags.includes(t)).map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onMouseDown={() => handleAddTag(tag)}
                                className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-350 hover:bg-purple-600/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                              >
                                {tag}
                              </button>
                            ))
                          )
                        ) : (
                          /* Suggested tags for the selected subject code */
                          suggestedTags.filter(t => !documentTags.includes(t)).length === 0 ? (
                            <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">
                              Không còn tag gợi ý. Bạn có thể tự gõ tag mới.
                            </span>
                          ) : (
                            <>
                              <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 px-2 py-1 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">Gợi ý cho môn {uploadSubject}</span>
                              {suggestedTags.filter(t => !documentTags.includes(t)).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  onMouseDown={() => handleAddTag(tag)}
                                  className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
                                >
                                  <span>{tag}</span>
                                  <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/10">+ Chọn</span>
                                </button>
                              ))
                              }
                            </>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload action and progress */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4 flex-wrap gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <Info className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Hỗ trợ định dạng PDF, PowerPoint, Word. Dung lượng khuyến nghị &lt; 10MB</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-extrabold text-xs px-5 py-4.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4" />
                    {isUploading ? "Đang xử lý lưu trữ..." : "Lưu vào máy chủ"}
                  </Button>
                </div>

                {/* Loading state bar */}
                {isUploading && (
                  <div className="w-full flex flex-col gap-2 mt-2">
                    <div className="flex justify-between text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                      <span>Đang mã hóa & ghi nhận vào cơ sở dữ liệu học thuật...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </form>
            </Card>

            {/* Documents filtering & Grid */}
            <section className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-purple-600 dark:bg-purple-500 rounded" />
                  Danh mục tài liệu học phần ({filteredDocuments.length})
                </h2>

                {/* Filters */}
                <div className="flex items-center gap-2 relative">
                  <span className="text-xs font-bold text-slate-500">Lọc theo:</span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortMenu(!showSortMenu);
                    }}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <span>
                      {sortConfig.key === "upload_date" && sortConfig.direction === "desc" && "Ngày tải lên (Mới nhất)"}
                      {sortConfig.key === "upload_date" && sortConfig.direction === "asc" && "Ngày tải lên (Cũ nhất)"}
                      {sortConfig.key === "file_size" && sortConfig.direction === "desc" && "Kích cỡ (Lớn nhất)"}
                      {sortConfig.key === "file_size" && sortConfig.direction === "asc" && "Kích cỡ (Nhỏ nhất)"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {showSortMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                    >
                      {[
                        { label: "Ngày tải lên (Mới nhất)", key: "upload_date", direction: "desc" },
                        { label: "Ngày tải lên (Cũ nhất)", key: "upload_date", direction: "asc" },
                        { label: "Kích cỡ (Lớn nhất)", key: "file_size", direction: "desc" },
                        { label: "Kích cỡ (Nhỏ nhất)", key: "file_size", direction: "asc" }
                      ].map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSortConfig({ key: option.key, direction: option.direction });
                            setShowSortMenu(false);
                          }}
                          className={`w-full flex items-center text-left px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${sortConfig.key === option.key && sortConfig.direction === option.direction
                            ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Table List of documents */}
              <div className="w-full border border-slate-200/30 dark:border-white/5 rounded-xl overflow-hidden bg-white/30 dark:bg-[#0f111a]/45 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="border-b border-slate-200/30 dark:border-white/5 bg-slate-100/30 dark:bg-white/5 text-slate-450 dark:text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                        <th className="px-5 py-3.5">Tiêu đề học liệu</th>
                        <th className="px-5 py-3.5">Môn học</th>
                        <th className="px-5 py-3.5">Tác giả</th>
                        <th className="px-5 py-3.5">Ngày lưu trữ</th>
                        <th className="px-5 py-3.5">Dung lượng</th>
                        <th className="px-5 py-3.5 text-right">Tùy chọn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-500 dark:text-slate-400">
                      {loading ? (
                        Array(3).fill(0).map((_, idx) => (
                          <tr key={idx} className="animate-pulse">
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                            <td className="px-5 py-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-6 ml-auto" /></td>
                          </tr>
                        ))
                      ) : filteredDocuments.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-5 py-8 text-center text-xs font-bold text-slate-400">
                            Thư mục trống. Hãy điền thông tin bên trên và nhấn "Lưu vào máy chủ" để tải tài liệu lên.
                          </td>
                        </tr>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <tr key={doc.document_id} onClick={() => handlePreviewClick(doc)} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group border-b border-slate-200/30 dark:border-white/5">
                            <td className="px-5 py-3.5 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold max-w-xs truncate">
                              {getFileIcon(doc.file_type || getFileType(doc.file_url), "w-4 h-4 shrink-0")}
                              <div className="flex flex-col min-w-0">
                                <span className="truncate group-hover:text-purple-600 transition-colors">{doc.title}</span>
                                {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {doc.tags.map(t => (
                                      <span key={t.tag_id || t.tag_name} className="px-1.5 py-0.5 rounded bg-purple-100/60 dark:bg-purple-950/40 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/10">
                                        {t.tag_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                              {doc.subject_code}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[9px] shrink-0">
                                  {fullName.charAt(0)}
                                </span>
                                <span>{fullName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-bold">
                              {new Date(doc.upload_date).toLocaleDateString("vi-VN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-500 dark:text-slate-400">{formatFileSize(doc.file_size)}</td>

                            <td className="px-5 py-3.5 text-right relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === doc.document_id ? null : doc.document_id);
                                }}
                                className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 flex items-center justify-center transition-colors font-bold ml-auto relative"
                              >
                                ⋯
                              </button>

                              {openMenuId === doc.document_id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-5 top-10 w-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                                >

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      if (doc.file_url) {
                                        const link = document.createElement("a");
                                        link.href = doc.file_url + "?download=";
                                        link.download = doc.title || "download";
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      } else {
                                        toast.error("Không tìm thấy đường dẫn tải xuống!");
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-slate-400" />
                                    Tải xuống
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setShareModalDoc(doc);
                                      setShareDescription(doc.description || "");
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                  >
                                    <Share2 className="w-4 h-4 text-slate-400" />
                                    Chia sẻ
                                  </button>
                                  <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleDeleteDocument(doc.document_id, e);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Gỡ bỏ
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── SCREEN 3: AI ASSISTANT VIEW (Academic Study Chat) ── */}
        {activeTab === "AI Assistant" && (
          <div className="flex-1 flex flex-col justify-between py-2 select-none h-full animate-in fade-in-50 duration-300 max-w-4xl w-full mx-auto">
            {/* Minimal Header */}
            <header className="flex flex-col gap-1 text-left select-none border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trợ lý Nghiên cứu Khoa học & Học thuật AI</span>
              </div>
              <h1 className="text-2xl font-black text-black dark:text-white mt-1">
                AI Scholar Assistant
              </h1>
              <p className="text-xs text-slate-450 mt-1 font-medium">Hệ thống phân tích bài luận, cấu trúc mã nguồn và tóm tắt thuật toán khoa học.</p>
            </header>

            {/* Chat Messages flow (Perplexity-like simplicity) */}
            <div className="flex-1 overflow-y-auto my-5 bg-white/30 dark:bg-[#0f111a]/30 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 rounded-xl p-4.5 flex flex-col gap-4.5 custom-scrollbar shadow-inner">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] rounded-xl p-4 text-xs leading-relaxed border transition-all duration-305 ${msg.sender === "ai"
                    ? "bg-white/70 dark:bg-[#0f111a]/70 backdrop-blur-md border-slate-200/40 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-slate-800 dark:text-slate-200 self-start shadow-sm"
                    : "bg-purple-600/10 dark:bg-purple-500/15 border-purple-500/20 dark:border-purple-400/20 text-purple-900 dark:text-purple-200 self-end shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                    }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                    {msg.sender === "ai" ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-purple-700 dark:text-purple-300">Học giả AI (Scholar Core)</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-[9px] font-extrabold uppercase tracking-widest">Học viên</span>
                      </>
                    )}
                  </div>
                  <p className="font-bold whitespace-pre-line leading-relaxed">{msg.text}</p>
                </div>
              ))}

              {isAiTyping && (
                <div className="bg-white dark:bg-[#13141f]/95 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 self-start shadow-sm flex items-center gap-2 animate-pulse">
                  <Bot className="w-4 h-4 text-purple-500 animate-spin" />
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">AI Đang lập luận học thuật...</span>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-col gap-2 mb-4">
              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Đề xuất câu hỏi thảo luận</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { text: "Giải thích về môn học Thiết kế Web (WED202c)", label: "Cấu trúc WED202c" },
                  { text: "Tóm tắt thuật toán Dijkstra tìm đường đi ngắn nhất", label: "Giải thuật Dijkstra" },
                  { text: "Tầm quan trọng của Đại số tuyến tính trong học máy", label: "Đại số tuyến tính & AI" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(item.text)}
                    disabled={isAiTyping}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200/30 dark:border-white/5 bg-white/45 dark:bg-[#0f111a]/45 backdrop-blur-md hover:bg-white/60 dark:hover:bg-[#0f111a]/65 active:scale-[0.98] transition-all cursor-pointer text-left text-xs font-bold text-slate-750 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Perplexity-style Premium Chat Input */}
            <div className="w-full relative select-none">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="relative flex flex-col gap-3 bg-white/65 dark:bg-[#0f111a]/70 backdrop-blur-xl border border-slate-200/40 dark:border-white/10 rounded-xl shadow-lg p-3.5 focus-within:ring-1 focus-within:ring-purple-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all"
              >
                {/* Input text */}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Nhập câu hỏi học tập hoặc dán mã nguồn cần phân tích..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isAiTyping}
                    className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-slate-400 text-slate-800 dark:text-slate-100 py-1"
                  />

                  <button
                    type="submit"
                    disabled={isAiTyping}
                    className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm focus:outline-none"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Options inside Input box (Duolingo/Notion vibe) */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2.5 text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-4">
                    <button type="button" className="flex items-center gap-1 hover:text-purple-600 transition-colors">
                      <Paperclip className="w-3.5 h-3.5" /> Đính kèm tài liệu
                    </button>

                    {/* Copilot toggle */}
                    <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-4">
                      <input
                        type="checkbox"
                        id="copilot-mode"
                        checked={useCopilotMode}
                        onChange={() => setUseCopilotMode(!useCopilotMode)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="copilot-mode" className="cursor-pointer select-none hover:text-purple-600">Copilot (Lập luận sâu)</label>
                    </div>
                  </div>

                  <span>AI Study Scholar v2.0</span>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── SCREEN 4: COMMUNITY ── */}
        {activeTab === "Community" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up text-left">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Cộng đồng học tập</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                Tài liệu chia sẻ cộng đồng
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Tìm kiếm và tham khảo toàn bộ tài liệu chia sẻ từ các học viên khác trên toàn hệ thống.
              </span>
            </header>

            {/* Search */}
            <div className="w-full flex justify-center mt-2">
              <SearchBar
                search={communitySearch}
                setSearch={setCommunitySearch}
                userId={user?.user_id || null}
                onSearch={(keyword) => {
                  setCommunitySearch(keyword);
                  setCommunityPage(1);
                }}
                placeholder="Tìm kiếm tài liệu cộng đồng, môn học, tác giả..."
                className="max-w-2xl mx-auto"
              />
            </div>

            {/* Stats */}
            <div className="h-10 flex items-center justify-center select-none">
              {!communityLoading && communitySearch && (
                <div className="px-3.5 py-1.5 bg-purple-500/8 dark:bg-purple-500/12 text-purple-750 dark:text-purple-300 rounded-full border border-purple-500/10 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95 duration-200">
                  Tìm thấy {filteredCommunityDocs.length} tài liệu học tập
                </div>
              )}
            </div>

            {/* Loading */}
            {communityLoading && (
              <div className="flex flex-col justify-center items-center py-20 space-y-4">
                <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase animate-pulse">
                  Đang tải danh mục cộng đồng...
                </span>
              </div>
            )}

            {/* Document List Grid */}
            {!communityLoading && (
              <>
                {filteredCommunityDocs.length > 0 && (
                  <div className="w-full flex flex-col space-y-6">
                    {/* HÀNG 1: HIỂN THỊ CÁC TÀI LIỆU ĐÃ GHIM */}
                    {pinnedCommunityDocs.length > 0 && (
                      <div className="space-y-3 bg-purple-50/20 dark:bg-purple-950/5 p-4 rounded-2xl border border-purple-100/30 text-left w-full">
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                          <span>📌 Tài liệu ghim đầu trang</span>
                          <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                            {pinnedCommunityDocs.length}
                          </span>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                          {pinnedCommunityDocs.map((doc) => (
                            <DocumentCard
                              key={doc.id}
                              doc={doc}
                              isPinned={doc.isPinned}
                              onTogglePin={() => handleToggleCommunityPin(doc.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HÀNG 2: HIỂN THỊ CÁC TÀI LIỆU CÒN LẠI */}
                    <div className="space-y-3 text-left w-full">
                      {pinnedCommunityDocs.length > 0 && (
                        <div className="text-xs font-bold text-slate-450 uppercase tracking-wider pl-1">
                          📂 Tài liệu cộng đồng khác
                        </div>
                      )}

                      {regularCommunityDocs.length > 0 ? (
                        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                          {regularCommunityDocs.map((doc) => (
                            <DocumentCard
                              key={doc.id}
                              doc={doc}
                              isPinned={doc.isPinned}
                              onTogglePin={() => handleToggleCommunityPin(doc.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        pinnedCommunityDocs.length > 0 && (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium bg-white/40 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5">
                            Không còn tài liệu nào khác trên trang này.
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}


                {/* Empty State */}
                {filteredCommunityDocs.length === 0 && (
                  <div className="text-center py-20 bg-white/30 dark:bg-[#0f111a]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                    <div className="text-5xl mb-4">📂</div>
                    <p className="text-sm font-bold text-slate-850 dark:text-slate-200 m-0">
                      Không tìm thấy tài liệu phù hợp
                    </p>
                    <p className="text-xs text-slate-450 mt-2 m-0">
                      Vui lòng thử tìm kiếm bằng một từ khóa khác.
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {filteredCommunityDocs.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      page={communityPage}
                      totalPages={communityTotalPages}
                      setPage={setCommunityPage}
                    />
                  </div>
                )}
              </>
            )}

            {/* Study Groups */}
            <section className="flex flex-col gap-4 mt-6">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-3.5 bg-purple-600 dark:bg-purple-500 rounded" />
                Nhóm học thảo luận trực tuyến
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {studyGroups.map((group) => (
                  <Card key={group.id} className="liquid-glass liquid-glass-hover rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-col gap-1 text-center md:text-left">
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{group.name}</span>
                      <span className="text-[10px] text-slate-450 font-bold">Môn học: {group.subject} | Sĩ số: {group.members} học viên</span>
                    </div>
                    <Button
                      onClick={() => alert(`Đang gia nhập ${group.name}...`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-sm"
                    >
                      Vào phòng
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── SCREEN 5: NOTIFICATIONS TIMELINE ── */}
        {activeTab === "Notifications" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Nhật ký hệ thống</span>
              <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
                Lịch sử & Thông báo học tập
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Theo dõi quá trình cập nhật trạng thái học tập từ trợ lý AI và Giảng viên.
              </span>
            </header>

            {/* Timeline Layout */}
            <div className="liquid-glass rounded-xl p-6 shadow-sm flex flex-col gap-6">
              {notificationsList.map((notif, idx) => {
                const Icon = notif.type === "success"
                  ? CheckCircle
                  : notif.type === "warning"
                    ? AlertTriangle
                    : Info;

                const iconColor = notif.type === "success"
                  ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                  : notif.type === "warning"
                    ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    : "text-blue-500 bg-blue-50 dark:bg-blue-950/20";

                return (
                  <div key={notif.id} className="flex gap-4 relative">
                    {/* Line connector */}
                    {idx < notificationsList.length - 1 && (
                      <span className="absolute left-4.5 top-9 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                    )}

                    {/* Left Icon Badge */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Right Context */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{notif.text}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{notif.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCREEN 6: PROFILE & SETTINGS ── */}
        {activeTab === "Personal Profile" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Định danh tài khoản</span>
              <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
                Hồ sơ sinh viên
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Thông tin xác thực thông qua hệ thống học đường và Google Cloud.
              </span>
            </header>

            {/* Profile ID Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left student identity */}
              <div className="md:col-span-1">
                <Card className="liquid-glass rounded-xl p-6 flex flex-col items-center gap-4 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white text-2xl shadow-sm">
                    {fullName.charAt(0)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-black dark:text-slate-100">{fullName}</span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded font-bold uppercase self-center">Hệ sinh viên</span>
                  </div>

                  <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1" />

                  <div className="w-full flex flex-col gap-2 text-xs text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Mã số định danh:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{user?.user_id || "STUDENT_ID"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Thư điện tử:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]" title={user?.email}>{user?.email}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Security parameters */}
              <div className="md:col-span-2 flex flex-col gap-6">

                {/* 1. Auth config card */}
                <Card className="liquid-glass rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-500" /> Cấu hình đăng nhập định danh
                  </h3>

                  <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-widest">Email đăng nhập</label>
                      <Input
                        type="email"
                        value={user?.email}
                        disabled
                        className="bg-slate-50/30 dark:bg-[#13141f]/30 border-slate-200/40 dark:border-slate-850 rounded-lg px-4 py-5 text-xs text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-555 uppercase tracking-widest">Hệ quyền hạn</label>
                      <Input
                        type="text"
                        value={user?.role || "STUDENT"}
                        disabled
                        className="bg-slate-50/30 dark:bg-[#13141f]/30 border-slate-200/40 dark:border-slate-850 rounded-lg px-4 py-5 text-xs text-slate-400 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>
                </Card>

                {/* 2. Change Password Form Card */}
                <Card className="liquid-glass rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-500" /> Đổi mật khẩu học tập mới
                  </h3>

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    {changePasswordError && (
                      <div className="flex items-start gap-2.5 text-xs text-red-650 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-550" />
                        <span className="font-bold">{changePasswordError}</span>
                      </div>
                    )}

                    {changePasswordSuccess && (
                      <div className="flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-900/30 rounded-xl p-3.5 backdrop-blur-md">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                        <span className="font-bold">{changePasswordSuccess}</span>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-450 dark:text-slate-555 uppercase tracking-widest">Mật khẩu hiện tại</label>
                        <button
                          type="button"
                          onClick={handleSendResetEmail}
                          disabled={resetEmailLoading}
                          className="text-[10px] font-bold text-purple-650 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline cursor-pointer focus:outline-none transition-all"
                        >
                          {resetEmailLoading ? "Đang gửi email..." : "Quên mật khẩu hiện tại?"}
                        </button>
                      </div>
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu hiện tại"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={changePasswordLoading || resetEmailLoading}
                        className="bg-white/40 dark:bg-[#0c0d13]/60 border-slate-200/50 dark:border-slate-800 rounded-lg px-4 py-5 text-xs focus-visible:ring-1 focus-visible:ring-purple-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-widest">Mật khẩu mới</label>
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={changePasswordLoading}
                        className="bg-white/40 dark:bg-[#0c0d13]/60 border-slate-200/50 dark:border-slate-800 rounded-lg px-4 py-5 text-xs focus-visible:ring-1 focus-visible:ring-purple-500"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-widest">Xác nhận mật khẩu mới</label>
                      <Input
                        type="password"
                        placeholder="Nhập lại mật khẩu mới để xác nhận"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={changePasswordLoading}
                        className="bg-white/40 dark:bg-[#0c0d13]/60 border-slate-200/50 dark:border-slate-800 rounded-lg px-4 py-5 text-xs focus-visible:ring-1 focus-visible:ring-purple-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={changePasswordLoading}
                      className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-extrabold text-xs px-5 py-4.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start mt-2 transition-all active:scale-[0.98]"
                    >
                      {changePasswordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Premium Centered Delete Confirmation Modal */}
      {deleteConfirmDocId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 bg-white/95 dark:bg-[#0f111a]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-1 border border-red-500/10">
              <AlertTriangle className="w-6 h-6 text-red-555 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Xác nhận xóa học liệu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này khỏi hệ thống lưu trữ đám mây của AIStudyHub không?</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDocId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteDocumentConfirmed(deleteConfirmDocId);
                  setDeleteConfirmDocId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200/60 dark:border-red-900/30 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white dark:hover:text-white hover:border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Centered Duplicate Confirmation Modal */}
      {duplicateConfirmData && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 bg-white/95 dark:bg-[#0f111a]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-650 dark:text-yellow-400 flex items-center justify-center mx-auto mb-1 border border-yellow-500/10">
              <AlertTriangle className="w-6 h-6 text-yellow-555 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Xác nhận trùng lặp</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {duplicateConfirmData.isFileDuplicate && duplicateConfirmData.isTitleDuplicate ? (
                  <>Tệp tin và Tiêu đề học liệu <span className="font-bold text-slate-800 dark:text-slate-200">"{duplicateConfirmData.title}"</span> đã tồn tại. Bạn có muốn đổi tên thành bản sao "(1)" và tiếp tục tải lên không?</>
                ) : duplicateConfirmData.isFileDuplicate ? (
                  <>Tệp tin <span className="font-bold text-slate-800 dark:text-slate-200">"{duplicateConfirmData.file.name}"</span> đã tồn tại. Bạn có muốn đổi tên thành bản sao "(1)" và tải lên không?</>
                ) : (
                  <>Tiêu đề học liệu <span className="font-bold text-slate-800 dark:text-slate-200">"{duplicateConfirmData.title}"</span> đã tồn tại. Bạn có đồng ý tự động thêm "(1)" vào tiêu đề để tiếp tục tải lên không?</>
                )}
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDuplicateConfirmData(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  let finalFile = duplicateConfirmData.file;
                  let finalTitle = duplicateConfirmData.title;
                  if (duplicateConfirmData.isFileDuplicate) {
                    const nameParts = finalFile.name.split(".");
                    const ext = nameParts.length > 1 ? nameParts.pop() : "";
                    const baseName = nameParts.join(".");
                    const newName = ext ? `${baseName} (1).${ext}` : `${baseName} (1)`;
                    finalFile = new File([finalFile], newName, { type: finalFile.type });
                  }
                  if (duplicateConfirmData.isTitleDuplicate) {
                    finalTitle = `${finalTitle} (1)`;
                  }
                  setDuplicateConfirmData(null);
                  handleRealUpload(null, true, { fileToUpload: finalFile, finalTitle });
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-yellow-650 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-900/30 hover:bg-yellow-500 hover:text-white dark:hover:text-white hover:border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300"
              >
                Tiếp tục tải lên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Share Modal */}
      {shareModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200" onClick={() => !isSharing && setShareModalDoc(null)}>
          <div className="w-full max-w-md p-6 bg-white/95 dark:bg-[#0f111a]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 flex items-center justify-center border border-purple-500/10">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Chia sẻ lên cộng đồng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Mọi người sẽ có thể xem và tải tài liệu này</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tài liệu: <span className="font-bold text-slate-900 dark:text-white">{shareModalDoc.title}</span>
              </p>
              <textarea
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="Nhập mô tả tài liệu (tùy chọn nhưng khuyến khích)..."
                className="w-full mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-sm min-h-[100px] resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => !isSharing && setShareModalDoc(null)}
                disabled={isSharing}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSharing(true);
                  try {
                    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                    const res = await fetch(`http://localhost:5000/api/documents/${shareModalDoc.document_id}/share`, {
                      method: "PUT",
                      headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ description: shareDescription })
                    });
                    if (!res.ok) throw new Error("Failed");
                    toast.success("Đã chia sẻ tài liệu lên cộng đồng thành công!");
                    setShareModalDoc(null);
                    window.location.reload();
                  } catch (err) {
                    toast.error("Lỗi khi chia sẻ tài liệu");
                  } finally {
                    setIsSharing(false);
                  }
                }}
                disabled={isSharing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white border border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300 disabled:opacity-70"
              >
                {isSharing ? "Đang chia sẻ..." : (
                  <><Share2 className="w-4 h-4" /> Chia sẻ ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
