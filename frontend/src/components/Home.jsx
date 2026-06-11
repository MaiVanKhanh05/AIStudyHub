import { useState, useEffect, useRef } from "react";
import { useSearchHistory } from "../hooks/useSearchHistory";
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
  ChevronLeft,
  Calendar,
  BookOpen,
  HelpCircle,
  Globe,
  Lock,
  Tag,
  Clock,
  X,
  Mail,
  Phone,
  Pencil,
  Save,
  Heart,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Mic
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

function extractSources(text) {
  if (!text) return { cleanText: "", sources: [] };
  
  const index = text.indexOf("📚 **Nguồn tham khảo**");
  const indexAlt = text.indexOf("📚 Nguồn tham khảo");
  const targetIndex = index !== -1 ? index : indexAlt;
  
  if (targetIndex === -1) {
    return { cleanText: text, sources: [] };
  }
  
  const mainText = text.substring(0, targetIndex).trim();
  const sourcesText = text.substring(targetIndex);
  
  const sources = [];
  const lines = sourcesText.split("\n");
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s+(.*?)\s+-\s+\*(.*?)\*(?:\s+\((.*?)\))?$/);
    if (match) {
      sources.push({
        index: match[1],
        title: match[2].trim(),
        source: match[3].trim(),
        url: match[4] ? match[4].trim() : ""
      });
    }
  }
  
  return { cleanText: mainText, sources };
}

const getSourceIcon = (sourceName) => {
  const name = sourceName.toLowerCase();
  if (name.includes("google")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-rose-100 text-rose-600 dark:bg-rose-950/45 dark:text-rose-405 font-black text-[9px] shrink-0 select-none">G</span>;
  }
  if (name.includes("acm")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-blue-950/45 dark:text-blue-405 font-black text-[9px] shrink-0 select-none">A</span>;
  }
  if (name.includes("w3schools")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-405 font-black text-[9px] shrink-0 select-none">W</span>;
  }
  if (name.includes("mozilla") || name.includes("mdn")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-orange-100 text-orange-600 dark:bg-orange-950/45 dark:text-orange-405 font-black text-[9px] shrink-0 select-none">M</span>;
  }
  if (name.includes("wikipedia")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350 font-black text-[9px] shrink-0 select-none">W</span>;
  }
  if (name.includes("arxiv")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-405 font-black text-[9px] shrink-0 select-none">X</span>;
  }
  if (name.includes("crossref")) {
    return <span className="w-4 h-4 flex items-center justify-center rounded bg-purple-100 text-purple-600 dark:bg-purple-950/45 dark:text-purple-405 font-black text-[9px] shrink-0 select-none">C</span>;
  }
  return <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
};

const formatToDDMMYYYY = (dateString) => {
  if (!dateString) return "Chưa cập nhật";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Chưa cập nhật";
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
};
const monthNamesVi = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];
const weekdaysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function Home() {
  const navigate = useNavigate();
  const isUploadingRef = useRef(false);
  const calendarPopoverRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const mainContentRef = useRef(null);

  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [isCalDragging, setIsCalDragging] = useState(false);
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  const [personalRangeStart, setPersonalRangeStart] = useState(null);
  const [personalRangeEnd, setPersonalRangeEnd] = useState(null);
  const [isPersonalCalDragging, setIsPersonalCalDragging] = useState(false);
  const [uploadCalDate, setUploadCalDate] = useState(new Date());

  useEffect(() => {
    if (!showCalendarPopover) return;
    const handleOutsideClick = (e) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(e.target)) {
        setShowCalendarPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showCalendarPopover]);

  useEffect(() => {
    if (!isCalDragging) return;
    const handleGlobalMouseUp = () => {
      setIsCalDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isCalDragging]);

  useEffect(() => {
    if (!isPersonalCalDragging) return;
    const handleGlobalMouseUp = () => {
      setIsPersonalCalDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isPersonalCalDragging]);

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
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const [docManagePage, setDocManagePage] = useState(1);
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");

  // Community Tab States & Dynamic Data Loader
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPage, setCommunityPage] = useState(1);
  const [communityDocs, setCommunityDocs] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilterMode, setCommunityFilterMode] = useState("ALL");

  useEffect(() => {
    setCommunityPage(1);
  }, [rangeStart, rangeEnd]);

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

  const fetchBookmarkedDocs = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/documents/bookmarks", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarkedDocs(data);
      }
    } catch (err) {
      console.error("Error fetching bookmarked documents:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "Bookmarks") {
      fetchBookmarkedDocs();
    }
  }, [activeTab]);
  // Community search history
  const {
    history: communitySearchHistory,
    addToHistory: addCommunitySearchHistory,
    removeFromHistory: removeCommunitySearchHistory,
    clearHistory: clearCommunitySearchHistory,
  } = useSearchHistory("aistudyhub_community_search_history");

  // Toggle: show 10 recent vs. show all history entries
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Called when user presses Enter in community search bar OR selects a history item
  const handleCommunitySearch = (keyword) => {
    setCommunitySearch(keyword);
    if (keyword.trim()) {
      addCommunitySearchHistory(keyword.trim());
    }
  };

  useEffect(() => {
    setCommunityPage(1);
  }, [communitySearch]);

  const handleToggleCommunityPin = (id) => {
    setCommunityDocs((prevDocs) =>
      prevDocs.map((doc) =>
        (doc.document_id || doc.id) === id ? { ...doc, isPinned: !doc.isPinned } : doc
      )
    );
  };

  const mySharedCommunityDocs = user ? communityDocs.filter(doc => doc.user_id === user.user_id) : [];
  const sourceCommunityDocs = communityFilterMode === "ALL" ? communityDocs : mySharedCommunityDocs;

  const filteredCommunityDocs = sourceCommunityDocs.filter((doc) => {
    let matchesSearch = true;
    if (communitySearch) {
      const keyword = communitySearch.toLowerCase().trim();
      matchesSearch = (
        (doc.title && doc.title.toLowerCase().includes(keyword)) ||
        (doc.subject_name && doc.subject_name.toLowerCase().includes(keyword)) ||
        (doc.subject_code && doc.subject_code.toLowerCase().includes(keyword)) ||
        (doc.author && doc.author.toLowerCase().includes(keyword))
      );
    }

    let matchesDate = true;
    if (rangeStart && rangeEnd) {
      const docDate = new Date(doc.upload_date);
      docDate.setHours(0, 0, 0, 0);

      const d1 = new Date(rangeStart);
      const d2 = new Date(rangeEnd);
      const start = d1 < d2 ? d1 : d2;
      const end = d1 < d2 ? d2 : d1;
      
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      matchesDate = docDate.getTime() >= start.getTime() && docDate.getTime() <= end.getTime();
    } else if (rangeStart) {
      const docDate = new Date(doc.upload_date);
      const start = new Date(rangeStart);
      matchesDate = (
        docDate.getFullYear() === start.getFullYear() &&
        docDate.getMonth() === start.getMonth() &&
        docDate.getDate() === start.getDate()
      );
    }

    return matchesSearch && matchesDate;
  });

  const sortedCommunityDocs = [
    ...filteredCommunityDocs.filter(d => d.isPinned),
    ...filteredCommunityDocs.filter(d => !d.isPinned)
  ];

  const COMMUNITY_PAGE_SIZE = 9;
  const communityTotalPages = Math.max(1, Math.ceil(sortedCommunityDocs.length / COMMUNITY_PAGE_SIZE));
  const currentCommunityDocs = sortedCommunityDocs.slice(
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
  const [docManageMode, setDocManageMode] = useState("UPLOADED"); // "UPLOADED" | "BOOKMARKED"

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

  // States for Edit Document feature
  const [editModalDoc, setEditModalDoc] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTags, setEditTags] = useState([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editTagSuggestions, setEditTagSuggestions] = useState([]);
  const [showEditTagSuggestions, setShowEditTagSuggestions] = useState(false);
  const [editSuggestedTags, setEditSuggestedTags] = useState([]);
  const [editSubjectSearch, setEditSubjectSearch] = useState("");
  const [showEditSubjectDropdown, setShowEditSubjectDropdown] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
  const [aiMode, setAiMode] = useState("General AI");
  const [useWeb, setUseWeb] = useState(false);
  const [useScholar, setUseScholar] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const toolMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target)) {
        setShowToolMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // States for Avatar Upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    phone: user?.phone || "",
    dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
    gender: user?.gender || "",
    major: user?.major || ""
  });

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);

    try {
      // 1. Upload new avatar to Supabase
      const uploadResult = await uploadFileToSupabase(avatarFile, "AIStudyHub", user.user_id);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Không thể tải ảnh lên Supabase Storage.");
      }

      const newAvatarUrl = uploadResult.fileUrl;

      // 2. Delete old avatar from Supabase if it exists and is stored in Supabase
      const getSupabasePath = (url, bucketName = "AIStudyHub") => {
        if (!url) return null;
        const searchStr = `/storage/v1/object/public/${bucketName}/`;
        const index = url.indexOf(searchStr);
        if (index !== -1) {
          return decodeURIComponent(url.substring(index + searchStr.length));
        }
        return null;
      };

      const oldPath = getSupabasePath(user?.avatar_url, "AIStudyHub");
      if (oldPath) {
        const newPath = getSupabasePath(newAvatarUrl, "AIStudyHub");
        if (newPath && oldPath !== newPath) {
          try {
            await deleteFileFromSupabase(oldPath, "AIStudyHub");
          } catch (delErr) {
            console.warn("Failed to delete old avatar file from Supabase:", delErr);
          }
        }
      }

      // 3. Update backend database with the new avatar URL
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: user?.phone || "",
          dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
          gender: user?.gender || "",
          major: user?.major || "",
          avatar_url: newAvatarUrl
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();

        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } else if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }

        toast.success("Cập nhật ảnh đại diện thành công!");
        setAvatarFile(null);
        setAvatarPreview(null);
        window.location.reload();
      } else {
        toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleEditProfileToggle = () => {
    if (!isEditingProfile) {
      setEditProfileData({
        phone: user?.phone || "",
        dob: user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
        gender: user?.gender || "",
        major: user?.major || ""
      });
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editProfileData),
      });

      if (res.ok) {
        const updatedUser = await res.json();

        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } else if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }

        setIsEditingProfile(false);
        toast.success("Cập nhật thông tin thành công!");
        window.location.reload();
      } else {
        let errMsg = "Lỗi khi lưu hồ sơ";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          console.error("Non-JSON error response", e);
        }
        toast.error(errMsg);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      
      const [dashRes, bookmarkRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/documents/dashboard?userId=${user.user_id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/documents/bookmarks`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(err => {
          console.error("Error fetching bookmarks:", err);
          return { data: [] }; // Fallback
        })
      ]);

      setDocuments(dashRes.data.documents || []);
      setStorageUsage(dashRes.data.storageUsage || 0);
      setBookmarkedDocs(bookmarkRes.data || []);
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
    
    // Fetch when mounting or when active tab changes to these
    if (activeTab === "Home" || activeTab === "Document Management" || activeTab === "Bookmarks") {
      fetchDashboard();
    }
  }, [navigate, user?.user_id, activeTab]);

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

  // Fetch subject-specific tags whenever the edit subject changes
  useEffect(() => {
    if (!user) return;
    const loadEditSubjectTags = async () => {
      if (!editSubject) {
        setEditSuggestedTags([]);
        return;
      }
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(`http://localhost:5000/api/tags/subject/${editSubject}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = response.data;
        const tagNames = data.map(t => t.tag_name);
        setEditSuggestedTags(tagNames);
      } catch (error) {
        console.error("Error loading edit subject tags:", error);
      }
    };
    loadEditSubjectTags();
  }, [editSubject, user]);

  const handleEditTagSearch = async (val) => {
    setEditTagInput(val);
    if (!val.trim()) {
      setEditTagSuggestions([]);
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
      setEditTagSuggestions(data.map(t => t.tag_name));
    } catch (error) {
      console.error("Error searching edit tags:", error);
    }
  };

  const handleAddEditTag = (tagName) => {
    const cleanTag = tagName.trim().replace(/\s+/g, "_");
    if (cleanTag && !editTags.includes(cleanTag) && editTags.length < 5) {
      setEditTags([...editTags, cleanTag]);
    }
    setEditTagInput("");
    setEditTagSuggestions([]);
    setShowEditTagSuggestions(false);
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
  const handleSendChatMessage = async (textToSend) => {
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

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const payload = {
        message: text,
        history: aiMessages,
        aiMode: aiMode,
        useWeb: useWeb,
        useScholar: useScholar,
        deepResearch: deepResearch,
        documentContext: attachedFile ? attachedFile.content : ""
      };

      const res = await axios.post("http://localhost:5000/api/chat", payload, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: res.data.response || "Không nhận được phản hồi từ AI."
        }
      ]);
    } catch (err) {
      console.error("AI assistant chat error:", err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi kết nối đến máy chủ AI.";
      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: `❌ **Lỗi Kết Nối:** ${errMsg}`
        }
      ]);
      toast.error("Trò chuyện AI thất bại.");
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle temporary file attachment
  const handleAttachFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post("http://localhost:5000/api/chat/upload-temp", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      setAttachedFile({
        name: res.data.fileName,
        size: res.data.fileSize,
        type: res.data.fileType,
        content: res.data.extractedText
      });
      
      toast.success(`Tải lên và phân tích tệp "${res.data.fileName}" thành công!`);
    } catch (err) {
      console.error("File parsing failed:", err);
      const errMsg = err.response?.data?.error || err.message || "Không thể tải lên và xử lý tệp.";
      toast.error(`Phân tích tệp thất bại: ${errMsg}`);
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  // Get prompt chips based on file attachment
  const getPromptChips = () => {
    if (!attachedFile) {
      return [
        { text: "Giải thích về môn học Thiết kế Web (WED202c)", label: "Cấu trúc WED202c" },
        { text: "Tóm tắt thuật toán Dijkstra tìm đường đi ngắn nhất", label: "Giải thuật Dijkstra" },
        { text: "Tầm quan trọng của Đại số tuyến tính trong học máy", label: "Đại số tuyến tính & AI" }
      ];
    }

    if (attachedFile.type === "ZIP") {
      return [
        { text: "Hãy phân tích kiến trúc hệ thống của dự án mã nguồn này.", label: "Phân tích kiến trúc" },
        { text: "Hãy tìm kiếm và phát hiện các code smell trong dự án này.", label: "Phát hiện code smell" },
        { text: "Hãy đề xuất refactor mã nguồn trong dự án này để tối ưu hơn.", label: "Đề xuất refactor" },
        { text: "Hãy vẽ sơ đồ lớp (Class Diagram bằng Mermaid) của dự án này.", label: "Vẽ sơ đồ lớp (Mermaid)" },
        { text: "Hãy giải thích cấu trúc dự án và chức năng của từng file/thư mục.", label: "Giải thích cấu trúc" }
      ];
    }

    return [
      { text: "Hãy tóm tắt nội dung chính của tài liệu này.", label: "Tóm tắt nội dung" },
      { text: "Hãy giải thích nội dung chi tiết từng chương của tài liệu này.", label: "Giải thích từng chương" },
      { text: "Hãy trích xuất toàn bộ các công thức quan trọng, định lý từ tài liệu.", label: "Trích công thức" },
      { text: "Hãy tạo danh sách các câu hỏi tự luận để ôn tập kiến thức từ tài liệu này.", label: "Tạo câu hỏi ôn tập" },
      { text: "Hãy tạo 5 câu trắc nghiệm (quiz) kèm đáp án để kiểm tra kiến thức từ tài liệu.", label: "Tạo quiz học tập" },
      { text: "Hãy tạo các cặp flashcard (Thuật ngữ - Định nghĩa) để học nhanh tài liệu.", label: "Tạo flashcard" }
    ];
  };

  // Helper to render markdown and code blocks in AI responses
  const renderMessageText = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <pre key={index} className="bg-slate-950 text-slate-100 font-mono text-[11px] p-3 rounded-lg overflow-x-auto my-2 border border-slate-800 text-left w-full select-text selection:bg-purple-500/30">
            {language && <div className="text-[9px] uppercase text-purple-400 font-extrabold tracking-wider border-b border-white/5 pb-1 mb-1.5">{language}</div>}
            <code>{code.trim()}</code>
          </pre>
        );
      }
      
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1.5 w-full text-left font-medium select-text selection:bg-purple-500/20">
          {lines.map((line, lineIdx) => {
            const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
            const cleanLine = isBullet ? line.trim().substring(2) : line;
            
            const segments = cleanLine.split(/(\*\*.*?\*\*)/g);
            const formattedLine = segments.map((seg, segIdx) => {
              if (seg.startsWith("**") && seg.endsWith("**")) {
                return <strong key={segIdx} className="font-extrabold text-black dark:text-white">{seg.slice(2, -2)}</strong>;
              }
              return seg;
            });
            
            if (isBullet) {
              return (
                <ul key={lineIdx} className="list-disc pl-5 my-0.5 space-y-1">
                  <li className="leading-relaxed">{formattedLine}</li>
                </ul>
              );
            }
            
            return <p key={lineIdx} className="leading-relaxed whitespace-pre-wrap">{formattedLine}</p>;
          })}
        </div>
      );
    });
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
    { name: "Bookmarks", icon: Heart, label: "Tài liệu Yêu thích" },
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
    const matchesSearch = (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.subject_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.subject_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === "All" || doc.subject_code === selectedSubjectFilter;
    
    let matchesDate = true;
    if (personalRangeStart) {
      const docDate = new Date(doc.upload_date);
      docDate.setHours(0, 0, 0, 0);
      const startTime = new Date(personalRangeStart);
      startTime.setHours(0, 0, 0, 0);
      
      if (personalRangeEnd) {
        const endTime = new Date(personalRangeEnd);
        endTime.setHours(23, 59, 59, 999);
        const minTime = Math.min(startTime.getTime(), endTime.getTime());
        const maxTime = Math.max(startTime.getTime(), endTime.getTime());
        matchesDate = docDate.getTime() >= minTime && docDate.getTime() <= maxTime;
      } else {
        matchesDate = docDate.getFullYear() === startTime.getFullYear() &&
                      docDate.getMonth() === startTime.getMonth() &&
                      docDate.getDate() === startTime.getDate();
      }
    }
    
    return matchesSearch && matchesSubject && matchesDate;
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
                <div className="relative w-8.5 h-8.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center font-extrabold text-purple-700 dark:text-purple-300 shrink-0 overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    fullName.charAt(0)
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#151722] animate-pulse z-10" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{fullName}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-none mt-1">
                    {user?.role === "ADMIN" ? "Quản trị viên" : user?.role === "LECTURER" ? "Giảng viên" : "Học viên"}
                  </span>
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
          {user?.role !== "ADMIN" && (
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
          )}

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
      <main ref={mainContentRef} className="flex-1 h-full overflow-y-auto flex flex-col p-6 md:p-8 gap-6 bg-transparent z-10">

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

            {/* 6:4 Responsive Grid Layout for Upload and History Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch w-full">
              {/* Left: Upload Form (7 parts) */}
              <div className="lg:col-span-7 h-full">
                <Card className="liquid-glass rounded-xl p-5 shadow-sm h-full flex flex-col">
                  <form onSubmit={handleRealUpload} className="flex flex-col gap-5 h-full">
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
                              <span className="text-xs font-bold text-slate-855 dark:text-slate-100 truncate">{selectedFile.name}</span>
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
                          className="bg-white dark:bg-[#0c0d13] border-slate-200 dark:border-slate-800 rounded-lg px-4 py-5 text-xs placeholder:text-slate-455 focus-visible:ring-1 focus-visible:ring-purple-500 font-semibold"
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
                              className="bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] placeholder:text-slate-455 h-8"
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
                                <div className="flex flex-col gap-1 p-1">
                                  <span className="text-[10px] text-slate-400 font-bold italic text-center py-1">Không tìm thấy học phần</span>
                                  {subjectSearchInput.trim() && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadSubject(subjectSearchInput.trim().toUpperCase());
                                        setSubjectSearchInput("");
                                        setShowSubjectDropdown(false);
                                      }}
                                      className="w-full text-left px-2.5 py-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg transition-colors flex items-center justify-between border border-purple-500/20"
                                    >
                                      <span>+ Thêm mã môn mới: "{subjectSearchInput.trim().toUpperCase()}"</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {subjectSearchInput.trim() && !subjectsList.some(sub => sub.subject_code.toLowerCase() === subjectSearchInput.trim().toLowerCase()) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadSubject(subjectSearchInput.trim().toUpperCase());
                                        setSubjectSearchInput("");
                                        setShowSubjectDropdown(false);
                                      }}
                                      className="w-full text-left px-2.5 py-2 mb-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg transition-colors flex items-center justify-between border border-purple-500/20"
                                    >
                                      <span>+ Thêm mã môn mới: "{subjectSearchInput.trim().toUpperCase()}"</span>
                                    </button>
                                  )}
                                  {subjectsList
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
                                    ))}
                                </>
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
                                  <span className="text-[9px] font-bold text-slate-455 dark:text-slate-500 px-2 py-1 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">Gợi ý cho môn {uploadSubject}</span>
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
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4 flex-wrap gap-4 mt-auto">
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
              </div>

              {/* Right: Upload History Calendar (3 parts) */}
              <div className="lg:col-span-3 w-full h-full">
                {(() => {
                  const uploadCalYear = uploadCalDate.getFullYear();
                  const uploadCalMonth = uploadCalDate.getMonth();
                  const uploadDaysInMonth = new Date(uploadCalYear, uploadCalMonth + 1, 0).getDate();
                  const uploadFirstDayOfWeek = new Date(uploadCalYear, uploadCalMonth, 1).getDay();
                  const uploadPaddingDays = uploadFirstDayOfWeek === 0 ? 6 : uploadFirstDayOfWeek - 1;

                  const uploadCells = [];
                  for (let i = 0; i < uploadPaddingDays; i++) {
                    uploadCells.push(null);
                  }
                  for (let day = 1; day <= uploadDaysInMonth; day++) {
                    uploadCells.push(new Date(uploadCalYear, uploadCalMonth, day));
                  }

                  const personalUploadStats = {};
                  documents.forEach((doc) => {
                    if (doc.upload_date) {
                      const d = new Date(doc.upload_date);
                      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                      personalUploadStats[dateKey] = (personalUploadStats[dateKey] || 0) + 1;
                    }
                  });

                  const getUploadDotColor = (count) => {
                    if (count <= 0) return null;
                    if (count < 5) return "bg-emerald-500 dark:bg-emerald-400"; // Light green
                    if (count < 10) return "bg-blue-500 dark:bg-blue-400"; // Clean blue
                    if (count < 20) return "bg-purple-500 dark:bg-purple-400"; // Rich purple
                    return "bg-rose-500 dark:bg-rose-400"; // Crimson rose
                  };

                  const handlePrevUploadMonth = () => {
                    setUploadCalDate(new Date(uploadCalYear, uploadCalMonth - 1, 1));
                  };
                  const handleNextUploadMonth = () => {
                    setUploadCalDate(new Date(uploadCalYear, uploadCalMonth + 1, 1));
                  };

                  const handlePersonalMouseDown = (cellDate, e) => {
                    e.preventDefault();
                    setPersonalRangeStart(cellDate);
                    setPersonalRangeEnd(null);
                    setIsPersonalCalDragging(true);
                  };

                  const handlePersonalMouseEnter = (cellDate) => {
                    if (isPersonalCalDragging) {
                      setPersonalRangeEnd(cellDate);
                    }
                  };

                  const handlePersonalMouseUp = (cellDate) => {
                    if (isPersonalCalDragging) {
                      setIsPersonalCalDragging(false);
                      if (personalRangeStart) {
                        let finalStart = personalRangeStart;
                        let finalEnd = cellDate;
                        if (personalRangeStart.getTime() > cellDate.getTime()) {
                          finalStart = cellDate;
                          finalEnd = personalRangeStart;
                        }
                        setPersonalRangeStart(finalStart);
                        setPersonalRangeEnd(finalEnd);

                        // Count uploads in range to trigger auto-scroll
                        let uploadsInRange = 0;
                        const startT = finalStart.getTime();
                        const endT = finalEnd.getTime();
                        documents.forEach((doc) => {
                          if (doc.upload_date) {
                            const d = new Date(doc.upload_date);
                            d.setHours(0, 0, 0, 0);
                            const dTime = d.getTime();
                            if (dTime >= startT && dTime <= endT) {
                              uploadsInRange++;
                            }
                          }
                        });

                        if (uploadsInRange > 0) {
                          setTimeout(() => {
                            if (documentsSectionRef.current && mainContentRef.current) {
                              const mainTop = mainContentRef.current.getBoundingClientRect().top;
                              const docTop = documentsSectionRef.current.getBoundingClientRect().top;
                              const targetScrollTop = mainContentRef.current.scrollTop + (docTop - mainTop) - 24;
                              mainContentRef.current.scrollTo({
                                top: targetScrollTop,
                                behavior: 'smooth'
                              });
                            }
                          }, 100);
                        }
                      }
                    }
                  };

                  return (
                    <Card className="liquid-glass rounded-xl p-5 shadow-sm space-y-4 select-none h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-500" />
                          Lịch sử tải lên cá nhân
                        </h3>
                        {personalRangeStart && (
                          <button
                            type="button"
                            onClick={() => {
                              setPersonalRangeStart(null);
                              setPersonalRangeEnd(null);
                            }}
                            className="text-[9px] font-black text-purple-650 hover:text-purple-800 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            Xóa lọc
                          </button>
                        )}
                      </div>

                      <div className="bg-slate-50/50 dark:bg-[#0c0d14]/50 border border-slate-100/80 dark:border-slate-800/40 rounded-xl p-3.5 flex-1 flex flex-col justify-between">
                        {/* Calendar Navigation */}
                        <div className="flex items-center justify-between mb-3.5">
                          <button
                            type="button"
                            onClick={handlePrevUploadMonth}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest">
                            {monthNamesVi[uploadCalMonth]}, {uploadCalYear}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextUploadMonth}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                          {weekdaysVi.map(day => (
                            <span key={day} className="text-[9px] font-extrabold text-slate-400 dark:text-slate-650">
                              {day}
                            </span>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {uploadCells.map((cellDate, idx) => {
                            if (!cellDate) {
                              return <div key={`empty-${idx}`} className="h-7 w-7" />;
                            }

                            const cellDay = cellDate.getDate();
                            const dateKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`;
                            const uploadCount = personalUploadStats[dateKey] || 0;

                            const selected = personalRangeStart && (
                              (() => {
                                const dTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
                                const startTime = new Date(personalRangeStart.getFullYear(), personalRangeStart.getMonth(), personalRangeStart.getDate()).getTime();
                                if (!personalRangeEnd) return dTime === startTime;
                                const endTime = new Date(personalRangeEnd.getFullYear(), personalRangeEnd.getMonth(), personalRangeEnd.getDate()).getTime();
                                const minTime = Math.min(startTime, endTime);
                                const maxTime = Math.max(startTime, endTime);
                                return dTime >= minTime && dTime <= maxTime;
                              })()
                            );

                            const boundary = personalRangeStart && (
                              (() => {
                                const dTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
                                const startTime = new Date(personalRangeStart.getFullYear(), personalRangeStart.getMonth(), personalRangeStart.getDate()).getTime();
                                if (!personalRangeEnd) return dTime === startTime;
                                const endTime = new Date(personalRangeEnd.getFullYear(), personalRangeEnd.getMonth(), personalRangeEnd.getDate()).getTime();
                                return dTime === startTime || dTime === endTime;
                              })()
                            );

                            let cellStyle = "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40";
                            if (boundary) {
                              cellStyle = "bg-purple-600 text-white font-extrabold shadow-sm shadow-purple-500/20 hover:bg-purple-700";
                            } else if (selected) {
                              cellStyle = "bg-purple-100 dark:bg-purple-900/35 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50";
                            } else if (uploadCount > 0) {
                              cellStyle = "bg-slate-100 dark:bg-slate-850 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold";
                            }

                            return (
                              <button
                                key={dateKey}
                                type="button"
                                onMouseDown={(e) => handlePersonalMouseDown(cellDate, e)}
                                onMouseEnter={() => handlePersonalMouseEnter(cellDate)}
                                onMouseUp={() => handlePersonalMouseUp(cellDate)}
                                className={`h-7 w-7 text-[10px] rounded-lg transition-all flex flex-col items-center justify-center relative font-bold cursor-pointer ${cellStyle}`}
                              >
                                <span>{cellDay}</span>
                                {uploadCount > 0 && (
                                  <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 left-1/2 -translate-x-1/2 ${getUploadDotColor(uploadCount)}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="text-[9px] text-slate-450 dark:text-slate-500 flex flex-col gap-2 font-bold uppercase tracking-wider pl-0.5 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        <div className="text-[10px] font-black text-slate-700 dark:text-slate-350">Chú thích tài liệu tải lên:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>&lt; 5 tài liệu</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span>&lt; 10 tài liệu</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                            <span>&lt; 20 tài liệu</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                            <span>&gt;= 20 tài liệu</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>


            {/* Documents filtering & Grid */}
            <section ref={documentsSectionRef} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-purple-600 dark:bg-purple-500 rounded" />
                  Tài liệu đã tải lên ({personalRangeStart || searchQuery || selectedSubjectFilter !== "All" ? `${filteredDocuments.length}/${documents.length}` : documents.length})
                </h2>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <SearchBar
                    search={searchQuery}
                    setSearch={setSearchQuery}
                    className="w-full sm:w-[250px]"
                  />

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
              </div>

              {personalRangeStart && (
                <div className="flex items-center justify-between p-3.5 bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 rounded-xl text-xs text-purple-900 dark:text-purple-250 select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 font-bold">
                    <Calendar className="w-4 h-4 text-purple-550" />
                    <span>
                      Đang lọc tài liệu tải lên{" "}
                      {!personalRangeEnd || personalRangeStart.getTime() === personalRangeEnd.getTime() ? (
                        <>ngày <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeStart)}</span></>
                      ) : (
                        <>từ ngày <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeStart)}</span> đến ngày <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeEnd)}</span></>
                      )}{" "}
                      ({filteredDocuments.length} tài liệu)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonalRangeStart(null);
                      setPersonalRangeEnd(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-purple-600/10 dark:hover:bg-purple-450/15 text-purple-750 dark:text-purple-305 active:scale-95 transition-all cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                        filteredDocuments.slice((docManagePage - 1) * 9, docManagePage * 9).map((doc) => (
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
                                  
                                  {doc.visibility === "PUBLIC" ? (
                                    <button
                                      disabled
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 rounded-md select-none"
                                    >
                                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                                      Đã chia sẻ
                                    </button>
                                  ) : (
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
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setEditModalDoc(doc);
                                      setEditTitle(doc.title || doc.document_name || "");
                                      setEditSubject(doc.subject_code || "");
                                      setEditSubjectSearch(doc.subject_code || "");
                                      const docTagNames = Array.isArray(doc.tags)
                                        ? doc.tags.map(t => typeof t === "string" ? t : t.tag_name)
                                        : [];
                                      setEditTags(docTagNames);
                                      setEditTagInput("");
                                      setEditTagSuggestions([]);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                  >
                                    <Pencil className="w-4 h-4 text-slate-400" />
                                    Chỉnh sửa
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
              {Math.ceil(filteredDocuments.length / 9) > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    page={docManagePage}
                    totalPages={Math.ceil(filteredDocuments.length / 9)}
                    setPage={setDocManagePage}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── NEW SCREEN: BOOKMARKS VIEW ── */}
        {activeTab === "Bookmarks" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Bộ sưu tập của bạn</span>
              <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1 flex items-center gap-2">
                Tài liệu Yêu thích
                <Heart className="w-6 h-6 fill-red-500 text-red-500" />
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Các tài liệu hay từ cộng đồng mà bạn đã đánh dấu.
              </span>
            </header>

            <section className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-red-500 rounded" />
                  Danh mục yêu thích ({bookmarkedDocs.length})
                </h2>
              </div>

              <div className="w-full flex flex-col space-y-6">
                {bookmarkedDocs.length === 0 ? (
                  <div className="text-center py-20 bg-white/30 dark:bg-[#0f111a]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                    <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">
                      <Heart className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-slate-850 dark:text-slate-200 m-0">
                      Bạn chưa yêu thích tài liệu nào
                    </p>
                    <p className="text-xs text-slate-450 mt-2 m-0">
                      Hãy quay lại cộng đồng và thả tim những tài liệu hữu ích nhé.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                      {bookmarkedDocs.slice((bookmarkPage - 1) * 9, bookmarkPage * 9).map((doc) => (
                        <DocumentCard
                          key={doc.document_id || doc.id}
                          doc={{ ...doc, isBookmarked: true }}
                          isPersonal={false}
                          isMyShared={false}
                        />
                      ))}
                    </div>
                    
                    {Math.ceil(bookmarkedDocs.length / 9) > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination
                          page={bookmarkPage}
                          totalPages={Math.ceil(bookmarkedDocs.length / 9)}
                          setPage={setBookmarkPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
        {activeTab === "AI Assistant" && (
          <div className="flex-1 flex flex-col justify-between py-2 select-none h-full animate-in fade-in-50 duration-300 max-w-4xl w-full mx-auto">
            {/* Minimal Header matching reference layout */}
            <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 select-none text-left">
              <div className="flex items-center gap-3">
                {/* Purple spark icon container */}
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-black text-slate-850 dark:text-white leading-tight">
                    AI Scholar Assistant
                  </h1>
                  <p className="text-[10.5px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Trợ lý nghiên cứu và học thuật AI</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode selection dropdown */}
                <div className="relative select-none">
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-355 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Scholar">Scholar Mode</option>
                    <option value="Research">Research Mode</option>
                    <option value="Coding">Coding Mode</option>
                    <option value="Summarize">Summarize Mode</option>
                    <option value="Translation">Translation Mode</option>
                    <option value="General AI">General AI</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                <button type="button" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer" title="Bản đồ học tập / Web">
                  <Globe className="w-4 h-4" />
                </button>
                <button type="button" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer" title="Lịch sử nghiên cứu">
                  <Clock className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs select-none shadow-sm" title={fullName}>
                  {fullName.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </header>

            {/* Chat Messages Flow */}
            <div className="flex-1 overflow-y-auto my-3 bg-[#F9FAFC] dark:bg-[#0b0c14] border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-5 custom-scrollbar shadow-inner h-[380px]">
              {aiMessages.map((msg) => {
                const isAi = msg.sender === "ai";

                if (isAi) {
                  const { cleanText, sources } = extractSources(msg.text);
                  return (
                    <div key={msg.id} className="flex items-start gap-3 self-start max-w-[90%] w-full">
                      {/* Robot profile icon */}
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-5 h-5 text-white" />
                      </div>

                      {/* Response card container */}
                      <div className="flex-1 bg-white dark:bg-[#11121d] border border-slate-100 dark:border-slate-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left">
                        {/* Card Header */}
                        <div className="flex items-center gap-2 mb-3 select-none">
                          <span className="text-xs font-black text-slate-850 dark:text-slate-100">AI Scholar</span>
                          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full border border-emerald-100/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Online</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-semibold ml-auto">{aiMode} mode</span>
                        </div>

                        {/* Message Content */}
                        <div className="text-xs text-slate-850 dark:text-slate-200 leading-relaxed font-medium">
                          {renderMessageText(cleanText)}
                        </div>

                        {/* Sources Section */}
                        {sources.length > 0 && (
                          <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-2.5 select-none">
                              <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Sources</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent custom-scrollbar max-w-full">
                              {sources.map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.url || "#"}
                                  target={src.url ? "_blank" : undefined}
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 w-48 p-2.5 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-xl transition-all flex flex-col justify-between group"
                                >
                                  <div>
                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider mb-1">
                                      {getSourceIcon(src.source)}
                                      <span className="text-slate-500 dark:text-slate-400 ml-1">{src.source}</span>
                                    </div>
                                    <p className="text-[10.5px] font-bold text-slate-700 dark:text-slate-250 line-clamp-2 leading-tight group-hover:text-purple-600 transition-colors">
                                      {src.title}
                                    </p>
                                  </div>
                                  <span className="text-[8.5px] text-slate-450 dark:text-slate-500 mt-2 block font-medium">
                                    {src.url ? "Xem nguồn tài liệu" : "Tài liệu học thuật"}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="flex items-center gap-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanText);
                              toast.success("Đã sao chép phản hồi vào bộ nhớ tạm!");
                            }}
                            className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                            title="Sao chép"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.success("Cảm ơn bạn đã phản hồi!")}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            title="Hữu ích"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.success("Cảm ơn bạn đã phản hồi!")}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Không hữu ích"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.success("Đã lưu vào danh sách đánh dấu!")}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                            title="Đánh dấu"
                          >
                            <Heart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              toast.success("Đã sao chép liên kết chia sẻ cuộc hội thoại!");
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ml-auto cursor-pointer"
                            title="Chia sẻ"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="flex items-start justify-end gap-3 self-end max-w-[85%]">
                      {/* User Text Bubble */}
                      <div className="bg-[#F0EEFF] dark:bg-purple-900/30 border border-purple-100/60 dark:border-purple-900/40 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-2xl rounded-tr-none text-xs text-left leading-relaxed font-semibold shadow-sm">
                        {msg.text}
                      </div>

                      {/* User Profile Avatar */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-[11px] select-none shadow-sm">
                          {fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 select-none font-medium">
                          {new Date(msg.id).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                }
              })}

              {isAiTyping && (
                <div className="flex items-start gap-3 self-start max-w-[90%] w-full">
                  <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-[#11121d] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-2.5 animate-pulse shadow-sm">
                    <Bot className="w-4 h-4 text-purple-500 animate-spin" />
                    <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">AI Đang lập luận học thuật...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-col gap-2 mb-3 text-left">
              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Đề xuất câu hỏi & Phân tích chuyên sâu</span>
              <div className="flex flex-wrap gap-2">
                {getPromptChips().map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(item.text)}
                    disabled={isAiTyping || isParsingFile}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200/30 dark:border-white/5 bg-white/45 dark:bg-[#0f111a]/45 backdrop-blur-md hover:bg-white/60 dark:hover:bg-[#0f111a]/65 active:scale-[0.98] transition-all cursor-pointer text-xs font-bold text-slate-755 dark:text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-left"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Container matching reference layout */}
            <div className="w-full relative select-none">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="relative flex flex-col gap-3 bg-white dark:bg-[#0f111a] border border-slate-200 focus-within:border-[#8B5CF6] focus-within:ring-1 focus-within:ring-purple-500/20 rounded-2xl shadow-sm focus-within:shadow-md transition-all p-3.5"
              >
                {/* File parsing state indicator */}
                {isParsingFile && (
                  <div className="flex items-center gap-2 bg-purple-500/10 dark:bg-purple-900/20 border border-purple-500/20 rounded-lg p-2.5 text-xs text-purple-700 dark:text-purple-300 font-bold animate-pulse text-left animate-in fade-in slide-in-from-top-1 duration-200">
                    <Bot className="w-4 h-4 text-purple-500 animate-spin" />
                    <span>Hệ thống đang tải lên và trích xuất tài liệu học tập, vui lòng đợi...</span>
                  </div>
                )}

                {/* Input Text Box Row */}
                <div className="flex items-center gap-3 relative">
                  {/* Plus Trigger Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowToolMenu(!showToolMenu);
                    }}
                    disabled={isParsingFile || isAiTyping}
                    className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-purple-100 dark:hover:bg-purple-950/40 text-slate-500 hover:text-[#8B5CF6] flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                    title="Đính kèm và Công cụ"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Floating Tool and File Upload Menu */}
                  {showToolMenu && (
                    <div
                      ref={toolMenuRef}
                      className="absolute bottom-12 left-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 text-left"
                    >
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">Tệp đính kèm</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowToolMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-850 dark:text-slate-200 leading-snug">Upload File</span>
                            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Tải lên bất kỳ tệp từ máy bạn</span>
                          </div>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">Công cụ</span>
                        
                        <button
                          type="button"
                          onClick={() => setUseWeb(!useWeb)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${useWeb ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${useWeb ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
                              <Globe className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-850 dark:text-slate-200 leading-snug">Search Web</span>
                              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Tìm thông tin trên Internet</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={useWeb}
                            onChange={() => setUseWeb(!useWeb)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => setUseScholar(!useScholar)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer mt-1.5 ${useScholar ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${useScholar ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-850 dark:text-slate-200 leading-snug">Academic Search</span>
                              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Tìm nguồn học thuật uy tín</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={useScholar}
                            onChange={() => setUseScholar(!useScholar)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeepResearch(!deepResearch)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer mt-1.5 ${deepResearch ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${deepResearch ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
                              <Search className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-850 dark:text-slate-200 leading-snug">Deep Research</span>
                              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">Nghiên cứu lập luận sâu</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={deepResearch}
                            onChange={() => setDeepResearch(!deepResearch)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Input field */}
                  <input
                    type="text"
                    placeholder="Hỏi bất cứ điều gì về học tập, nghiên cứu..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isAiTyping || isParsingFile}
                    className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-slate-400 text-slate-800 dark:text-slate-100 py-1.5 px-0.5"
                  />

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAttachFileChange}
                    accept=".pdf,.docx,.xlsx,.xls,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt,.json,.js,.py,.md"
                    className="hidden"
                  />

                  {/* Voice Button */}
                  <button
                    type="button"
                    onClick={() => toast.info("Tính năng thoại bằng giọng nói sẽ sớm ra mắt!")}
                    className="w-8 h-8 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-450 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Ghi âm câu hỏi"
                  >
                    <Mic className="w-4.5 h-4.5" />
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isAiTyping || isParsingFile || !chatInput.trim()}
                    className="w-8 h-8 rounded-full bg-[#8B5CF6] hover:bg-purple-700 text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                {/* Staged File Chips & Status Bottom Row */}
                <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-2.5 text-[10px] text-slate-400 font-bold select-none text-left">
                  {/* Purple sparks icon */}
                  <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />

                  {/* If there is a file attached, display it as a styled badge tag */}
                  {attachedFile ? (
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9.5px] font-extrabold select-none animate-in zoom-in-95 duration-150 ${
                      attachedFile.type === "PDF"
                        ? "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                        : attachedFile.type === "ZIP"
                        ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
                        : attachedFile.type === "IMAGE" || attachedFile.type === "PNG" || attachedFile.type === "JPG" || attachedFile.type === "JPEG"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                        : "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400"
                    }`}>
                      {getFileIcon(attachedFile.type, "w-3 h-3 shrink-0")}
                      <span className="max-w-[120px] truncate">{attachedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-355 ml-0.5 p-0.5 rounded-full hover:bg-black/5 cursor-pointer"
                        title="Xóa tệp đính kèm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400/80 font-medium">Không có tệp học liệu nào được đính kèm</span>
                  )}

                  {/* Active Tool indicators if no file attached */}
                  {!attachedFile && (useWeb || useScholar || deepResearch) && (
                    <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-3">
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-[#8B5CF6]">Active Tools:</span>
                      {useWeb && <span className="text-[8.5px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 px-1 py-0.5 rounded">Web Search</span>}
                      {useScholar && <span className="text-[8.5px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 px-1 py-0.5 rounded">Scholar</span>}
                      {deepResearch && <span className="text-[8.5px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 px-1 py-0.5 rounded">Deep Research</span>}
                    </div>
                  )}

                  <span className="ml-auto text-[9px] text-slate-450">AI Study Scholar v3.0</span>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* ── SCREEN 4: COMMUNITY ── */}
        {activeTab === "Community" && (() => {
          const calYear = currentCalDate.getFullYear();
          const calMonth = currentCalDate.getMonth();
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
          const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

          const cells = [];
          for (let i = 0; i < paddingDays; i++) {
            cells.push(null);
          }
          for (let day = 1; day <= daysInMonth; day++) {
            cells.push(new Date(calYear, calMonth, day));
          }

          const datesWithDocs = new Set();
          communityDocs.forEach(doc => {
            if (doc.upload_date) {
              const d = new Date(doc.upload_date);
              datesWithDocs.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
          });



          const handlePrevMonth = () => {
            setCurrentCalDate(new Date(calYear, calMonth - 1, 1));
          };
          const handleNextMonth = () => {
            setCurrentCalDate(new Date(calYear, calMonth + 1, 1));
          };

          return (
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

              {/* Bài đã share của tôi */}
              {user && communityFilterMode === "ALL" && mySharedCommunityDocs.length > 0 && !communityLoading && (
                <div className="mb-2 bg-white dark:bg-slate-900 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <FolderOpen size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tài liệu bạn đã chia sẻ</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Bạn đã đóng góp {mySharedCommunityDocs.length} tài liệu cho cộng đồng</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCommunityFilterMode("MY_SHARED")}
                      className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      Xem tất cả
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {mySharedCommunityDocs.slice(0, 3).map((doc) => (
                      <DocumentCard
                        key={doc.document_id || doc.id}
                        doc={doc}
                        isPersonal={false}
                        isMyShared={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Nút quay lại khi đang xem bài của tôi */}
              {communityFilterMode === "MY_SHARED" && (
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <BookOpen size={24} /> Toàn bộ bài bạn đã chia sẻ ({mySharedCommunityDocs.length})
                  </h2>
                  <button
                    onClick={() => setCommunityFilterMode("ALL")}
                    className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
                  >
                    Quay lại thư viện chung
                  </button>
                </div>
              )}

              {/* Search and Date Filter Section */}
              <div className="w-full max-w-2xl mx-auto flex items-center gap-3 mt-2 relative">
                <div className="flex-1">
                  <SearchBar
                    search={communitySearch}
                    setSearch={setCommunitySearch}
                    userId={user?.user_id || null}
                    onSearch={(keyword) => {
                      setCommunitySearch(keyword);
                      setCommunityPage(1);
                    }}
                    placeholder="Tìm kiếm tài liệu cộng đồng, môn học, tác giả..."
                    className="w-full"
                  />
                </div>

                {/* Date Filter Toggle Button and Popover */}
                <div className="relative flex items-center gap-2" ref={calendarPopoverRef}>
                  <button
                    onClick={() => setShowCalendarPopover(!showCalendarPopover)}
                    className={`
                      flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-300 shadow-sm h-[46px] select-none cursor-pointer
                      ${showCalendarPopover || rangeStart
                        ? "bg-purple-600 border-purple-650 text-white shadow-purple-500/10"
                        : "bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border-slate-200/30 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#0f111a]/60 hover:text-purple-600 dark:hover:text-purple-400"
                      }
                    `}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">
                      {rangeStart ? (
                        rangeEnd && rangeStart.toDateString() !== rangeEnd.toDateString() ? (
                          `${rangeStart.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })} - ${rangeEnd.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}`
                        ) : (
                          rangeStart.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })
                        )
                      ) : (
                        "Lọc ngày"
                      )}
                    </span>
                  </button>

                  {rangeStart && (
                    <button
                      onClick={() => {
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      title="Xóa bộ lọc ngày"
                      className="h-[46px] w-[46px] flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200/20 dark:border-red-900/30 transition-all select-none cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Calendar Popover */}
                  {showCalendarPopover && (
                    <div className="absolute right-0 top-[52px] w-[320px] p-4 bg-white dark:bg-[#0f111a] border border-slate-200/85 dark:border-white/10 rounded-2xl shadow-xl z-[9999] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={handlePrevMonth}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {monthNamesVi[calMonth]}, {calYear}
                        </span>
                        <button
                          onClick={handleNextMonth}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Day Names */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {weekdaysVi.map(day => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>

                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((cellDate, idx) => {
                          if (!cellDate) {
                            return <div key={`empty-${idx}`} className="h-8" />;
                          }

                          const cellDay = cellDate.getDate();

                          // Drag Selection Highlights
                          const selected = rangeStart && (
                            (() => {
                              const dTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
                              const startTime = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
                              if (!rangeEnd) return dTime === startTime;
                              const endTime = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();
                              const minTime = Math.min(startTime, endTime);
                              const maxTime = Math.max(startTime, endTime);
                              return dTime >= minTime && dTime <= maxTime;
                            })()
                          );

                          const boundary = rangeStart && (
                            (() => {
                              const dTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
                              const startTime = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
                              if (!rangeEnd) return dTime === startTime;
                              const endTime = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();
                              return dTime === startTime || dTime === endTime;
                            })()
                          );

                          // Mouse handlers for range selection
                          const handleMouseDown = (e) => {
                            e.preventDefault();
                            setRangeStart(cellDate);
                            setRangeEnd(null);
                            setIsCalDragging(true);
                          };

                          const handleMouseEnter = () => {
                            if (isCalDragging) {
                              setRangeEnd(cellDate);
                            }
                          };

                          const handleMouseUp = () => {
                            if (isCalDragging) {
                              setIsCalDragging(false);
                              if (rangeStart) {
                                if (rangeStart.getTime() > cellDate.getTime()) {
                                  setRangeStart(cellDate);
                                  setRangeEnd(rangeStart);
                                } else {
                                  setRangeEnd(cellDate);
                                }
                              }
                            }
                          };

                          return (
                            <button
                              key={`day-${cellDay}`}
                              onMouseDown={handleMouseDown}
                              onMouseEnter={handleMouseEnter}
                              onMouseUp={handleMouseUp}
                              className={`
                                h-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all select-none cursor-pointer
                                ${boundary
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 hover:bg-purple-700"
                                  : selected
                                    ? "bg-purple-100 dark:bg-purple-900/35 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                    : "text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }
                              `}
                            >
                              {cellDay}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-slate-450 dark:text-slate-500 font-medium italic">
                          Kéo chuột để chọn nhiều ngày
                        </span>
                        <button
                          onClick={() => {
                            setRangeStart(null);
                            setRangeEnd(null);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Đặt lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="h-10 flex items-center justify-center select-none">
                {!communityLoading && (communitySearch || rangeStart) && (
                  <div className="px-3.5 py-1.5 bg-purple-500/8 dark:bg-purple-500/12 text-purple-750 dark:text-purple-300 rounded-full border border-purple-500/10 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
                    <span>Tìm thấy {filteredCommunityDocs.length} tài liệu học tập</span>
                    {rangeStart && (
                      <span className="bg-purple-500/20 px-2 py-0.5 rounded text-[9px] font-extrabold text-purple-700 dark:text-purple-300">
                        Lọc ngày: {rangeStart.toLocaleDateString("vi-VN")} {rangeEnd && `- ${rangeEnd.toLocaleDateString("vi-VN")}`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Loading & Grid Section */}
              {communityLoading ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase animate-pulse">
                    Đang tải danh mục cộng đồng...
                  </span>
                </div>
              ) : (
                /* Layout: Document List takes full width */
                <div className="w-full flex flex-col space-y-6">
                  {filteredCommunityDocs.length > 0 ? (
                    <>
                      {/* Pinned Documents */}
                      {pinnedCommunityDocs.length > 0 && (
                        <div className="space-y-3 bg-purple-50/20 dark:bg-purple-950/5 p-4 rounded-2xl border border-purple-100/30 text-left w-full">
                          <div className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                            <span>📌 Tài liệu ghim đầu trang</span>
                            <span className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">
                              {pinnedCommunityDocs.length}
                            </span>
                          </div>
                          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                            {pinnedCommunityDocs.map((doc) => (
                              <DocumentCard
                                key={doc.document_id || doc.id}
                                doc={doc}
                                isPinned={doc.isPinned}
                                onTogglePin={() => handleToggleCommunityPin(doc.id)}
                                isPersonal={false}
                                isMyShared={communityFilterMode === "MY_SHARED"}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Regular Documents */}
                      <div className="space-y-3 text-left w-full">
                        {pinnedCommunityDocs.length > 0 && (
                          <div className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest pl-1">
                            📂 Tài liệu cộng đồng khác
                          </div>
                        )}

                        {regularCommunityDocs.length > 0 ? (
                          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                            {regularCommunityDocs.map((doc) => (
                              <DocumentCard
                                key={doc.document_id || doc.id}
                                doc={doc}
                                isPinned={doc.isPinned}
                                onTogglePin={() => handleToggleCommunityPin(doc.id)}
                                isPersonal={false}
                                isMyShared={communityFilterMode === "MY_SHARED"}
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

                      {/* Pagination */}
                      <div className="mt-6 flex justify-center">
                        <Pagination
                          page={communityPage}
                          totalPages={communityTotalPages}
                          setPage={setCommunityPage}
                        />
                      </div>
                    </>
                  ) : (
                    /* Empty State */
                    <div className="text-center py-20 bg-white/30 dark:bg-[#0f111a]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 w-full">
                      <div className="text-5xl mb-4">📂</div>
                      <p className="text-sm font-bold text-slate-850 dark:text-slate-200 m-0">
                        Không tìm thấy tài liệu phù hợp
                      </p>
                      <p className="text-xs text-slate-450 mt-2 m-0">
                        Vui lòng thử tìm kiếm bằng một từ khóa khác hoặc xóa bộ lọc ngày.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up text-left">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Định danh tài khoản</span>
              <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
                Hồ sơ sinh viên
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                Thông tin xác thực thông qua hệ thống học đường và Google Cloud.
              </span>
            </header>

            {/* 1. Header Banner Card */}
            <Card className="liquid-glass rounded-3xl overflow-hidden shadow-sm border-0 bg-white/50 dark:bg-[#0f111a]/50">
              {/* Wave Banner */}
              <div className="w-full h-32 md:h-40 bg-gradient-to-r from-purple-100/60 via-purple-50/60 to-white dark:from-purple-900/40 dark:via-purple-800/30 dark:to-[#0f111a] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-200/50 via-transparent to-transparent dark:from-purple-800/50" />
              </div>

              <div className="px-6 md:px-10 pb-8 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  {/* Left Side: Avatar & Name */}
                  <div className="flex items-end gap-5">
                    {/* Avatar Container with overlapping camera badge */}
                    <div className="relative z-10 shrink-0 w-28 h-28 md:w-32 md:h-32 -mt-16">
                      <div className="w-full h-full rounded-full bg-purple-650 flex flex-col items-center justify-center font-bold text-white text-4xl shadow-md overflow-hidden transition-all duration-300 border-[6px] border-white dark:border-[#0f111a] group relative">
                        {avatarPreview || user?.avatar_url ? (
                          <img src={avatarPreview || user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="group-hover:opacity-0 transition-opacity duration-300">{fullName.charAt(0)}</span>
                        )}

                        <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer backdrop-blur-sm z-10">
                          <span className="text-xs font-bold uppercase tracking-wider">Đổi ảnh</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </label>
                      </div>

                      {/* Camera Badge overlapping Avatar (Bottom Right) */}
                      <div className="absolute bottom-1 right-1 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 z-20 pointer-events-none">
                        <UploadCloud className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>

                    {/* Name & Quick Info */}
                    <div className="flex flex-col pb-2">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{fullName}</span>
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded font-black uppercase tracking-widest">{user?.role === "ADMIN" ? "Quản trị viên" : "Hệ sinh viên"}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {user?.user_id || "STUDENT_ID"}</span>
                        <div className="w-[1.5px] h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <span className="flex items-center gap-1.5 truncate max-w-[150px] md:max-w-none"><Mail className="w-3.5 h-3.5" /> {user?.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Avatar Button */}
                  {avatarFile && (
                    <Button
                      size="sm"
                      onClick={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm px-6 mb-2"
                    >
                      {isUploadingAvatar ? "Đang tải..." : "Lưu ảnh mới"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* 2. Personal & Academic Info Card */}
            <Card className="liquid-glass rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm relative overflow-hidden border-0">
              <div className="flex justify-between items-center z-10 relative border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <h3 className="text-sm font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-purple-500" /> Thông tin cá nhân & Học tập
                </h3>
                {!isEditingProfile ? (
                  <button onClick={handleEditProfileToggle} className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-900/30 px-3.5 py-1.5 rounded-lg">
                    Chỉnh sửa
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleEditProfileToggle} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      Hủy
                    </button>
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors px-4 py-1.5 rounded-lg shadow-sm">
                      {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col w-full gap-0.5">
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Số điện thoại</span>
                    {isEditingProfile ? (
                      <Input value={editProfileData.phone} onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })} className="h-8 text-sm font-semibold bg-white dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 mt-1 focus-visible:ring-1 focus-visible:ring-purple-500" placeholder="Nhập số điện thoại" />
                    ) : (
                      <span className={`text-sm font-bold ${user?.phone ? 'text-slate-900 dark:text-white' : 'text-slate-450 italic'}`}>{user?.phone || "Chưa cập nhật"}</span>
                    )}
                  </div>
                </div>

                {/* DOB */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col w-full gap-0.5">
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Ngày sinh</span>
                    {isEditingProfile ? (
                      <Input type="date" value={editProfileData.dob} onChange={(e) => setEditProfileData({ ...editProfileData, dob: e.target.value })} className="h-8 text-sm font-semibold bg-white dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 mt-1 focus-visible:ring-1 focus-visible:ring-purple-500" />
                    ) : (
                      <span className={`text-sm font-bold ${user?.dob ? 'text-slate-900 dark:text-white' : 'text-slate-455 italic'}`}>{formatToDDMMYYYY(user?.dob)}</span>
                    )}
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col w-full gap-0.5">
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Giới tính</span>
                    {isEditingProfile ? (
                      <select value={editProfileData.gender} onChange={(e) => setEditProfileData({ ...editProfileData, gender: e.target.value })} className="h-8 text-sm font-semibold bg-white dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 px-3 outline-none mt-1 focus-visible:ring-1 focus-visible:ring-purple-500">
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    ) : (
                      <span className={`text-sm font-bold ${user?.gender ? 'text-slate-900 dark:text-white' : 'text-slate-455 italic'}`}>{user?.gender || "Chưa cập nhật"}</span>
                    )}
                  </div>
                </div>

                {/* Major */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/50">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex flex-col w-full gap-0.5">
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Ngành học</span>
                    {isEditingProfile ? (
                      <Input value={editProfileData.major} onChange={(e) => setEditProfileData({ ...editProfileData, major: e.target.value })} className="h-8 text-sm font-semibold bg-white dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 mt-1 focus-visible:ring-1 focus-visible:ring-purple-500" placeholder="Khoa học máy tính" />
                    ) : (
                      <span className={`text-sm font-bold ${user?.major ? 'text-slate-900 dark:text-white' : 'text-slate-455 italic'}`}>{user?.major || "Chưa cập nhật"}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Storage Card */}
            <Card className="liquid-glass rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm border-0">
              <h3 className="text-sm font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <Cloud className="w-4 h-4 text-blue-500" /> Dung lượng lưu trữ
              </h3>

              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-10">
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{usageInGB}<span className="text-xl md:text-2xl text-slate-500 ml-1 font-bold">GB</span></span>
                    <span className="text-sm font-bold text-slate-400 mb-1">/ {limitInGB} GB đã sử dụng</span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700/50">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-1.5">{percentage.toFixed(1)}% Không gian đám mây</span>
                </div>

                <Button
                  onClick={() => setActiveTab("Document Management")}
                  className="bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-black text-white font-extrabold text-xs rounded-xl px-7 py-6 whitespace-nowrap shadow-sm shrink-0 transition-transform active:scale-95"
                >
                  Quản lý tài liệu
                </Button>
              </div>
            </Card>

            {/* 4. Password Form Card */}
            <Card className="liquid-glass rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm border-0">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <h3 className="text-sm font-extrabold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-purple-500" /> Đổi mật khẩu học tập
                </h3>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={resetEmailLoading}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                >
                  {resetEmailLoading ? "Đang gửi email..." : "Quên mật khẩu?"}
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="flex flex-col gap-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mật khẩu hiện tại</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={changePasswordLoading || resetEmailLoading}
                      className="bg-white/60 dark:bg-[#0c0d13]/60 border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-5 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mật khẩu mới</label>
                    <Input
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={changePasswordLoading}
                      className="bg-white/60 dark:bg-[#0c0d13]/60 border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-5 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Xác nhận mật khẩu</label>
                    <Input
                      type="password"
                      placeholder="Nhập lại để xác nhận"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={changePasswordLoading}
                      className="bg-white/60 dark:bg-[#0c0d13]/60 border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-5 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-start mt-2">
                  <Button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wider px-8 py-5 rounded-xl shadow-sm transition-transform active:scale-95"
                  >
                    {changePasswordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                  </Button>
                </div>
              </form>
            </Card>
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
                    fetchDashboard();
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
      {/* ────── EDIT DOCUMENT MODAL ────── */}
      {editModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200" onClick={() => !isSavingEdit && setEditModalDoc(null)}>
          <div className="w-full max-w-md p-6 bg-white/95 dark:bg-[#0f111a]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 flex items-center justify-center border border-purple-500/10">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Chỉnh sửa tài liệu</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Cập nhật thông tin tài liệu</p>
                </div>
              </div>
              <button onClick={() => !isSavingEdit && setEditModalDoc(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title field */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên tài liệu <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Nhập tên tài liệu..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-sm text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Subject field */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Môn học (Tùy chọn)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={editSubjectSearch}
                  onChange={(e) => {
                    setEditSubjectSearch(e.target.value);
                    setEditSubject("");
                    setShowEditSubjectDropdown(true);
                  }}
                  onFocus={() => setShowEditSubjectDropdown(true)}
                  placeholder="Chọn hoặc nhập mã môn..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-sm text-slate-800 dark:text-slate-200 uppercase"
                />
                {editSubjectSearch && (
                  <button
                    onClick={() => {
                      setEditSubjectSearch("");
                      setEditSubject("");
                      setShowEditSubjectDropdown(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {showEditSubjectDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {subjectsList
                      .filter(s => s.subject_code.toLowerCase().includes(editSubjectSearch.toLowerCase()) || s.subject_name.toLowerCase().includes(editSubjectSearch.toLowerCase()))
                      .map(subj => (
                        <div
                          key={subj.subject_code}
                          onClick={() => {
                            setEditSubjectSearch(subj.subject_code);
                            setEditSubject(subj.subject_code);
                            setShowEditSubjectDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col"
                        >
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{subj.subject_code}</span>
                          <span className="text-[10px] text-slate-500 truncate">{subj.subject_name}</span>
                        </div>
                      ))}
                    {editSubjectSearch.trim() && !subjectsList.some(s => s.subject_code.toLowerCase() === editSubjectSearch.toLowerCase()) && (
                      <div
                        onClick={() => {
                          setEditSubject(editSubjectSearch.trim().toUpperCase());
                          setEditSubjectSearch(editSubjectSearch.trim().toUpperCase());
                          setShowEditSubjectDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs font-bold text-purple-600 flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm mã "{editSubjectSearch.trim().toUpperCase()}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tags field */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Thẻ phân loại (Tags)</label>
              <div className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus-within:ring-2 focus-within:ring-purple-500/50 flex flex-wrap gap-2 items-center min-h-[44px]">
                {editTags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button onClick={() => setEditTags(editTags.filter(t => t !== tag))} className="hover:text-purple-900 dark:hover:text-purple-100 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => handleEditTagSearch(e.target.value)}
                  onFocus={() => setShowEditTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowEditTagSuggestions(false), 250)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      if (editTagInput.trim()) {
                        handleAddEditTag(editTagInput);
                      }
                    }
                  }}
                  placeholder={editTags.length < 5 ? "Nhập tag hoặc chọn từ gợi ý..." : ""}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 min-w-[120px]"
                  disabled={editTags.length >= 5}
                />
              </div>

              {/* Floating dropdown suggestions in Edit modal */}
              {showEditTagSuggestions && (
                <div className="absolute top-[100%] left-0 right-0 mt-1.5 max-h-40 overflow-y-auto bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg z-[99999] p-2 flex flex-col gap-1">
                  {editTagInput.trim() ? (
                    editTagSuggestions.filter(t => !editTags.includes(t)).length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">
                        Không tìm thấy tag phù hợp. Nhấn Enter để thêm mới.
                      </span>
                    ) : (
                      editTagSuggestions.filter(t => !editTags.includes(t)).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={() => handleAddEditTag(tag)}
                          className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-350 hover:bg-purple-600/10 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                        >
                          {tag}
                        </button>
                      ))
                    )
                  ) : (
                    editSuggestedTags.filter(t => !editTags.includes(t)).length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">
                        Không còn tag gợi ý môn học. Bạn có thể tự gõ tag mới.
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">Gợi ý cho môn {editSubject}</span>
                        {editSuggestedTags.filter(t => !editTags.includes(t)).map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onMouseDown={() => handleAddEditTag(tag)}
                            className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
                          >
                            <span>{tag}</span>
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/45 px-1.5 py-0.5 rounded border border-purple-500/10">+ Chọn</span>
                          </button>
                        ))}
                      </>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => !isSavingEdit && setEditModalDoc(null)}
                disabled={isSavingEdit}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editTitle.trim()) { toast.warning("Vui lòng nhập tiêu đề tài liệu!"); return; }
                  setIsSavingEdit(true);
                  try {
                    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                    const targetId = editModalDoc.document_id || editModalDoc.id;
                    const res = await fetch(`http://localhost:5000/api/documents/${targetId}/edit`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: editTitle.trim(),
                        subject: editSubject || editSubjectSearch || "OTHER",
                        tags: editTags,
                        description: editModalDoc.description || null,
                      })
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || "Cập nhật thất bại");
                    }
                    toast.success("Cập nhật tài liệu thành công!");
                    setEditModalDoc(null);
                    if (typeof fetchDashboard === "function") {
                      await fetchDashboard();
                    } else {
                      window.location.reload();
                    }
                  } catch (err) {
                    toast.error(`Lỗi: ${err.message}`);
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
                disabled={isSavingEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white border border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300 disabled:opacity-70"
              >
                {isSavingEdit ? "Đang lưu..." : (
                  <><Save className="w-4 h-4" /> Lưu thay đổi</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
