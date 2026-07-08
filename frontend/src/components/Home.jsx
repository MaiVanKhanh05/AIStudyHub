import { useState, useEffect, useRef, useMemo } from "react";
import { API_URL } from "@/config/api.js";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
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
  ArrowUp,
  Download,
  ChevronDown,
  ChevronUp,
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
  Pin,
  Menu,
  PanelLeft,
  SquarePen,
  MessageCircle,
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
  Mic,
  RotateCcw,
  Camera,
  Flame,
  Loader,
  Hash,
  Layers,
  Folder,
  RefreshCw,
  ArrowRight,
  History
} from "lucide-react";
import { Sparkle } from "@phosphor-icons/react";
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
import ShareDocumentModal from "./ShareDocumentModal";
import HomeDashboard from "./HomeDashboard";
import HistoryPage from "./HistoryPage";
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

function renderMiniIcon(fileType = "") {
  const type = (fileType || "").toLowerCase();
  if (type === "pdf") {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        PDF
      </div>
    );
  }
  if (["xls", "xlsx", "excel"].includes(type)) {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        XLSX
      </div>
    );
  }
  if (["doc", "docx"].includes(type)) {
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        DOCX
      </div>
    );
  }
  if (["ppt", "pptx", "powerpoint"].includes(type)) {
    return (
      <div className="w-8 h-8 rounded-lg bg-orange-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        PPTX
      </div>
    );
  }
  if (["zip", "rar"].includes(type)) {
    return (
      <div className="w-8 h-8 rounded-lg bg-amber-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        ZIP
      </div>
    );
  }
  if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) {
    return (
      <div className="w-8 h-8 rounded-lg bg-indigo-650 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
        IMG
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-600 text-white flex items-center justify-center font-extrabold text-[9px] select-none shadow-sm">
      FILE
    </div>
  );
}

function renderMiniBadge(fileType = "") {
  const type = (fileType || "").toLowerCase();
  let bgClass = "bg-red-500";
  if (["xls", "xlsx", "excel"].includes(type)) bgClass = "bg-emerald-600";
  else if (["doc", "docx"].includes(type)) bgClass = "bg-blue-600";
  else if (["ppt", "pptx"].includes(type)) bgClass = "bg-orange-500";
  else if (["zip", "rar"].includes(type)) bgClass = "bg-amber-500";
  else if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) bgClass = "bg-indigo-500";
  else bgClass = "bg-slate-500";

  return (
    <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center shadow-sm shrink-0`}>
      <FileText className="w-5 h-5 text-white" />
    </div>
  );
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

// Parse document preview links from AI response text
// Returns array of segments: { type: 'text'|'doclink', content: string, docId: string }
function extractDocumentLinks(text) {
  if (!text) return [{ type: 'text', content: '' }];
  // Match http://localhost:3000/preview/{id} or /preview/{id}
  const LINK_REGEX = /https?:\/\/localhost:\d+\/preview\/([a-zA-Z0-9\-_]+)/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = LINK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'doclink', content: match[0], docId: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

// Inline Document Card shown inside AI chat responses
function InlinedDocumentCard({ docId, onPreview }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchDoc = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/documents/${docId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        // Handle both { document: doc } and direct doc object
        const docData = data?.document || data;
        if (!cancelled) setDoc(docData);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDoc();
    return () => { cancelled = true; };
  }, [docId]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40 animate-pulse my-1">
        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex flex-col gap-1">
          <div className="h-2.5 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (failed || !doc) {
    // Fallback: just show a plain link
    return (
      <a
        href={`http://localhost:3000/preview/${docId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-600 dark:text-purple-400 underline text-xs font-semibold"
      >
        Xem tài liệu
      </a>
    );
  }

  const fileType = (doc.file_type || '').toLowerCase();
  const subject = doc.subject_name || doc.subject_code || doc.subject || 'Khác';
  const author = doc.author || doc.owner_name || 'Ẩn danh';
  const isLecturer = (doc.user_role || '').toUpperCase() === 'LECTURER' || (doc.user_role || '').toUpperCase() === 'LECTURE';

  // File type badge colors
  const typeColors = {
    pdf: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    docx: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    doc: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    xlsx: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    xls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    pptx: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
    ppt: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  };
  const typeBadge = typeColors[fileType] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

  return (
    <div
      className="my-1.5 flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-200 group max-w-[450px] w-full cursor-pointer"
      onClick={() => onPreview && onPreview(doc)}
      title="Nhấn để xem tài liệu"
    >
      {/* File type badge */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[9px] uppercase tracking-wider shrink-0 select-none ${typeBadge} border border-current/10`}>
        {fileType || 'FILE'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[12px] font-bold text-slate-850 dark:text-slate-100 truncate leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" title={doc.title}>
          {doc.title}
        </p>
        <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 mt-0.5 truncate">
          {subject}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
            <svg className="w-2.5 h-2.5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{author}</span>
          </span>
          {isLecturer && (
            <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 uppercase tracking-wide border border-indigo-200/40 dark:border-indigo-500/20">
              Giảng viên
            </span>
          )}
        </div>
      </div>
    </div>
  );
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
  if (typeof dateString === "string") {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Chưa cập nhật";
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const getSafeYYYYMMDD = (dateVal) => {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch (e) {
    return "";
  }
};

const getDaysInMonth = (month, year) => {
  return new Date(year, month, 0).getDate();
};

const SEMESTER_MAP = [
  {
    id: "sem1",
    name: "Học kỳ 1",
    description: "Nhập môn CNTT, cơ sở lập trình, kỹ năng nền tảng ngành.",
    color: "#3b82f6",
    subjects: [
      "ASI101", "CEA201", "CSI104", "CSI105", "CSI106",
      "MAE101", "PFP191", "PRF192", "SDI101m"
    ]
  },
  {
    id: "sem2",
    name: "Học kỳ 2",
    description: "Lập trình hướng đối tượng, mạng máy tính, hệ điều hành.",
    color: "#10b981",
    subjects: [
      "AIG201c", "AIG202c", "CMC201", "CSD203", "MAD101",
      "NWC203c", "NWC204", "OSG202", "PRN212", "PRO192"
    ]
  },
  {
    id: "sem3",
    name: "Học kỳ 3",
    description: "Cơ sở dữ liệu, thiết kế web, phát triển phần mềm.",
    color: "#8b5cf6",
    subjects: [
      "CSD201", "DBI202", "ITE303c", "NWC303", "SDP201", "WED201c"
    ]
  },
  {
    id: "sem4",
    name: "Học kỳ 4",
    description: "Cloud, IoT, quản lý dự án, kỹ nghệ phần mềm.",
    color: "#f59e0b",
    subjects: [
      "CCO201", "IOT102", "ITA203c", "OSP201",
      "PRJ301", "PRJ302", "SWE201c"
    ]
  },
  {
    id: "sem5",
    name: "Học kỳ 5",
    description: "Bảo mật, React, C#, kiểm thử phần mềm, thực tập dự án.",
    color: "#ec4899",
    subjects: [
      "CRY303c", "FER201m", "FER202", "IAM302", "ISM302",
      "ITE302c", "JSC301", "PRN211", "PRN292c", "SWP391", "SWT301"
    ]
  },
  {
    id: "sem6",
    name: "Học kỳ 6",
    description: "Thực tập doanh nghiệp và xử lý ngôn ngữ tự nhiên.",
    color: "#06b6d4",
    subjects: ["NLP301c", "OJT202"]
  },
  {
    id: "sem7",
    name: "Học kỳ 7",
    description: "AI nâng cao, Big Data, bảo mật, phân tán, thiết kế hệ thống.",
    color: "#f43f5e",
    subjects: [
      "ADS301m", "AIL302m", "AIT301", "BDI302c", "DAT301m",
      "IAP301", "IAW301", "ISC301", "ISC302", "ITB301c",
      "PRM392", "PRN221", "SDN301m", "SWD391", "SWD392", "SYB302c"
    ]
  },
  {
    id: "sem8",
    name: "Học kỳ 8",
    description: "Quản trị CSDL, quản lý dự án, khởi nghiệp, lập trình nâng cao.",
    color: "#14b8a6",
    subjects: [
      "AID301c", "DBM301", "DBW301", "DSS301", "EXE201",
      "IFT201c", "PMG201c", "PMG202c", "PRN231", "SPM401", "WDP301"
    ]
  },
  {
    id: "sem9",
    name: "Học kỳ 9",
    description: "Thực tập tốt nghiệp và đồ án Capstone Project.",
    color: "#6366f1",
    subjects: ["ISP490", "SEP490"]
  }
];

const OTHER_SUBJECTS_MAP = [
  "ADA201", "CSD202", "OSG203", "DIC201", "DWB301", "ENW493c",
  "IAR401", "ITB302c", "PRN222", "PRN232", "SDN302", "AIE301",
  "APO201", "BDI301c", "MCP201", "FAP201", "SSA101"
];

const monthNamesVi = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const weekdaysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const TOPIC_TRANSLATIONS = {
  "Lập trình C/C++": {
    enName: "C/C++ Programming",
    enDesc: "Algorithmic thinking and basic programming with C/C++."
  },
  "Lập trình Java": {
    enName: "Java/C# Programming",
    enDesc: "Advanced object-oriented programming and enterprise applications with Java/C#."
  },
  "Web Development": {
    enName: "Web Development",
    enDesc: "Build modern web applications from user interfaces to server systems."
  },
  "Mobile Development": {
    enName: "Mobile Development",
    enDesc: "Develop applications running on iOS and Android mobile platforms."
  },
  "Cơ sở dữ liệu": {
    enName: "Database Systems",
    enDesc: "Design, administer, and query relational and non-relational database systems."
  },
  "AI & Machine Learning": {
    enName: "AI & Machine Learning",
    enDesc: "Research on intelligent algorithms, knowledge representation, and machine learning."
  },
  "Data Science": {
    enName: "Data Science",
    enDesc: "Data mining, statistical analysis, and data-driven decision making."
  },
  "Mạng máy tính": {
    enName: "Computer Networking",
    enDesc: "Communication protocols, network architecture, and connection security."
  },
  "An toàn thông tin": {
    enName: "Information Security",
    enDesc: "System security, cryptography, intrusion detection, and information risk prevention."
  },
  "IoT & Embedded": {
    enName: "IoT & Embedded Systems",
    enDesc: "Connect hardware devices, microcontroller programming, and real-time systems."
  },
  "DevOps & Cloud": {
    enName: "DevOps & Cloud Computing",
    enDesc: "Continuous integration, automated deployment (CI/CD), and cloud infrastructure."
  },
  "Thiết kế phần mềm": {
    enName: "Software Design & Architecture",
    enDesc: "System architecture, software design principles, and engineering processes."
  },
  "Kiểm thử phần mềm": {
    enName: "Software Testing",
    enDesc: "Software quality assurance methods, writing test cases, and test automation."
  },
  "Dự án & Thực tập": {
    enName: "Internship & Graduation Project",
    enDesc: "Practical corporate internship and graduation capstone project."
  },
  "Game Development": {
    enName: "Game Development",
    enDesc: "Process of design, programming, and graphics creation for video games."
  },
  "Blockchain": {
    enName: "Blockchain",
    enDesc: "Blockchain principles, smart contracts, and decentralized application development."
  },
  "Information Systems": {
    enName: "Information Systems",
    enDesc: "Operate and manage integrated information flows in corporate organizations."
  }
};;

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const isUploadingRef = useRef(false);
  const calendarPopoverRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const mainContentRef = useRef(null);
  const seenNotificationsRef = useRef(new Set());
  const communitySearchSectionRef = useRef(null);
  const quickUploadInputRef = useRef(null);

  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const [isResizing, setIsResizing] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [isCalDragging, setIsCalDragging] = useState(false);
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  const [personalRangeStart, setPersonalRangeStart] = useState(null);
  const [personalRangeEnd, setPersonalRangeEnd] = useState(null);
  const [isPersonalCalDragging, setIsPersonalCalDragging] = useState(false);
  const [uploadCalDate, setUploadCalDate] = useState(new Date());

  // Fix page layout shift/cut-off by locking body scroll and resetting scroll position
  useEffect(() => {
    window.scrollTo(0, 0);

    // Save original styles
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;

    // Lock scroll on Home mount
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";

    return () => {
      // Restore styles on Home unmount
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

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

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const newWidth = Math.max(180, Math.min(320, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Rest of state variables ...
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [stats, setStats] = useState({ totalDocs: 0, publicDocs: 0, sharedDocs: 0 });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPersonalCalendarPopover, setShowPersonalCalendarPopover] = useState(false);
  const personalCalendarRef = useRef(null);

  // Load authenticated user session
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = useMemo(() => userStr ? JSON.parse(userStr) : null, [userStr]);
  const fullName = user?.first_name ? `${user.last_name} ${user.first_name}`.trim() : (user?.email || "Học Viên AIStudyHub");

  // Extract first name or display name
  const nameParts = fullName.trim().split(" ");
  const displayGreetingName = nameParts.length > 1
    ? nameParts.slice(-2).join(" ")
    : fullName;

  // Active navigation tab
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("activeTab") || "Home";
  });

  useEffect(() => {
    sessionStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const profileDropdownRef = useRef(null);
  const settingsDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [notifFilter, setNotifFilter] = useState("ALL");
  const [notificationsList, setNotificationsList] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unreadNotificationsCount = useMemo(() => notificationsList.filter(n => !n.is_read).length, [notificationsList]);

  // States for dynamic documents and storage usage

  // States for dynamic documents and storage usage
  const [documents, setDocuments] = useState([]);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const [docManagePage, setDocManagePage] = useState(1);
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const [processingDocId, setProcessingDocId] = useState(null);

  // Searchable subjects list
  const [subjectsList, setSubjectsList] = useState([]);

  // Community Tab States & Dynamic Data Loader
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPage, setCommunityPage] = useState(1);
  const [communityDocs, setCommunityDocs] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilterMode, setCommunityFilterMode] = useState("ALL");
  const [communityRoleFilter, setCommunityRoleFilter] = useState("ALL"); // "STUDENT", "LECTURER", or "ALL"
  const [communityTagFilter, setCommunityTagFilter] = useState(null); // tag_name string or null

  // AI Topics States
  const [communityViewMode, setCommunityViewMode] = useState("TOPICS"); // TOPICS | DOCS
  const [communityTopics, setCommunityTopics] = useState([]);
  const [communityTopicsLoading, setCommunityTopicsLoading] = useState(false);
  const [selectedCommunityTopicId, setSelectedCommunityTopicId] = useState(null);
  const [selectedCommunitySubjectCode, setSelectedCommunitySubjectCode] = useState(null);
  const [communityClassificationTab, setCommunityClassificationTab] = useState("ALL"); // "ALL" | "SEMESTERS"
  // Map of subject_code -> { subject_code, subject_name, doc_count } for subjects with public docs
  const [subjectsDocCounts, setSubjectsDocCounts] = useState([]);

  const getSemestersData = useMemo(() => {
    // Build a map from all subjects that have public documents
    // Source: /api/subjects/doc-counts — includes ALL subjects with docs, even those not in any topic
    const activeSubjectsMap = new Map();
    subjectsDocCounts.forEach(sub => {
      activeSubjectsMap.set(sub.subject_code, {
        subject_code: sub.subject_code,
        subject_name: sub.subject_name || "",
        doc_count: Number(sub.doc_count) || 0
      });
    });

    const allKnownCodes = new Set();
    SEMESTER_MAP.forEach(sem => sem.subjects.forEach(c => allKnownCodes.add(c)));
    OTHER_SUBJECTS_MAP.forEach(c => allKnownCodes.add(c));

    const searchLower = communitySearch.trim().toLowerCase();

    const groupedSemesters = SEMESTER_MAP.map(sem => {
      const semSubjects = sem.subjects.map(code => {
        const entry = activeSubjectsMap.get(code);
        return {
          subject_code: code,
          subject_name: entry ? entry.subject_name : "",
          doc_count: entry ? entry.doc_count : 0
        };
      }).filter(sub => {
        if (!searchLower) return true;
        const codeMatch = sub.subject_code.toLowerCase().includes(searchLower);
        const nameMatch = (sub.subject_name || "").toLowerCase().includes(searchLower);
        return codeMatch || nameMatch;
      });

      const totalDocs = semSubjects.reduce((acc, curr) => acc + curr.doc_count, 0);

      return {
        semester_id: sem.id,
        name: sem.name,
        description: sem.description,
        color: sem.color,
        subjects: semSubjects,
        totalDocs
      };
    });

    // Build "Khác" from:
    // 1. Explicitly listed OTHER_SUBJECTS_MAP codes
    // 2. Any subject with doc_count > 0 not in SEMESTER_MAP nor OTHER_SUBJECTS_MAP
    let otherSubjects = [];
    const addedOtherCodes = new Set();

    OTHER_SUBJECTS_MAP.forEach(code => {
      const entry = activeSubjectsMap.get(code);
      otherSubjects.push({
        subject_code: code,
        subject_name: entry ? entry.subject_name : code,
        doc_count: entry ? entry.doc_count : 0
      });
      addedOtherCodes.add(code);
    });

    // Append any remaining uploaded subjects not covered by SEMESTER_MAP or OTHER_SUBJECTS_MAP
    activeSubjectsMap.forEach((subData, code) => {
      if (!allKnownCodes.has(code) && !addedOtherCodes.has(code) && subData.doc_count > 0) {
        otherSubjects.push(subData);
      }
    });

    // Filter other subjects
    if (searchLower) {
      otherSubjects = otherSubjects.filter(sub => {
        const codeMatch = sub.subject_code.toLowerCase().includes(searchLower);
        const nameMatch = (sub.subject_name || "").toLowerCase().includes(searchLower);
        return codeMatch || nameMatch;
      });
    }

    const otherTotalDocs = otherSubjects.reduce((acc, curr) => acc + curr.doc_count, 0);

    const otherSemester = {
      semester_id: "other",
      name: "Khác",
      description: "Các môn học ngoài chương trình chuẩn hoặc chưa phân loại học kỳ.",
      color: "#64748b",
      subjects: otherSubjects,
      totalDocs: otherTotalDocs
    };

    // Filter semesters: only show semesters with matching subjects when filtering
    return [...groupedSemesters, otherSemester].filter(sem => {
      if (searchLower) {
        return sem.subjects.length > 0;
      }
      return sem.semester_id !== "other" || sem.subjects.some(s => s.doc_count > 0);
    });
  }, [subjectsDocCounts, communitySearch]);

  const fetchCommunityTopics = async () => {
    setCommunityTopicsLoading(true);
    try {
      const res = await axios.get(`/api/topics`);
      setCommunityTopics(res.data || []);
    } catch (err) {
      console.error("Error loading topics:", err);
    } finally {
      setCommunityTopicsLoading(false);
    }
  };

  const regenerateCommunityTopics = async () => {
    setCommunityTopicsLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(`/api/topics/regenerate`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCommunityTopics(res.data.topics || []);
    } catch (err) {
      console.error("Error regenerating topics:", err);
    } finally {
      setCommunityTopicsLoading(false);
    }
  };

  const fetchSubjectsDocCounts = async () => {
    try {
      const res = await axios.get(`/api/subjects/doc-counts`);
      setSubjectsDocCounts(res.data || []);
    } catch (err) {
      console.error("Error loading subjects doc counts:", err);
    }
  };

  useEffect(() => {
    fetchCommunityTopics();
    fetchSubjectsDocCounts();
  }, []);

  useEffect(() => {
    setCommunityPage(1);
  }, [communityRoleFilter, communityTagFilter]);

  useEffect(() => {
    setCommunityRoleFilter("ALL");
    setCommunityTagFilter(null);
  }, [activeTab]);

  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    const mainElement = mainContentRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      setIsScrolledDown(mainElement.scrollTop > 200);
    };

    mainElement.addEventListener("scroll", handleScroll);
    return () => {
      mainElement.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setCommunityPage(1);
  }, [rangeStart, rangeEnd, communityFilterMode]);

  const fetchCommunityDocs = async () => {
    setCommunityLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`/api/documents/community`, {
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
      const res = await fetch(`/api/documents/bookmarks`, {
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
    // Tag filter
    if (communityTagFilter) {
      const docTags = (doc.tags || []).map(t => t.tag_name);
      if (!docTags.includes(communityTagFilter)) return false;
    }

    // Topic Subject filter
    if (selectedCommunitySubjectCode) {
      if (doc.subject_code !== selectedCommunitySubjectCode) return false;
    }

    let matchesRole = true;
    if (communityFilterMode === "ALL") {
      if (communityRoleFilter === "LECTURER") {
        matchesRole = doc.uploader_role === "LECTURER";
      } else if (communityRoleFilter === "STUDENT") {
        matchesRole = doc.uploader_role !== "LECTURER";
      }
    }

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

    return matchesSearch && matchesDate && matchesRole;
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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem("sidebar_collapsed", String(newVal));
      return newVal;
    });
  };

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("OTHER");
  const [uploadVisibility, setUploadVisibility] = useState("PRIVATE");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "upload_date", direction: "desc" });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [shareModalDoc, setShareModalDoc] = useState(null);

  // Track document view history using backend API
  useEffect(() => {
    if (previewDoc && previewDoc.document_id && user?.user_id) {
      const recordHistory = async () => {
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          await fetch(`${API_URL}/api/documents/${previewDoc.document_id}/history`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (err) {
          console.error("Failed to save view history", err);
        }
      };
      recordHistory();
    }
  }, [previewDoc, user]);
  const [shareDescription, setShareDescription] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [docManageMode, setDocManageMode] = useState("UPLOADED"); // "UPLOADED" | "BOOKMARKED"
  const [personalSelectedFolder, setPersonalSelectedFolder] = useState(null);

  useEffect(() => {
    const handlePopState = (e) => {
      if (!e.state || e.state.view !== 'folder') {
        setPersonalSelectedFolder(null);
      } else if (e.state && e.state.view === 'folder') {
        setPersonalSelectedFolder(e.state.subj);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const checkOpenDoc = async () => {
      const openDocId = location.state?.openDocId;
      if (openDocId) {
        // Clear state immediately to prevent re-triggering on subsequent renders
        navigate(location.pathname, { replace: true, state: {} });
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const headers = {};
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          const res = await fetch(`${API_URL}/api/documents/${openDocId}`, {
            headers
          });
          if (res.ok) {
            const data = await res.json();
            const doc = data.document || data;
            const docWithContent = {
              ...doc,
              simulated_content: getSimulatedContent(doc.title || doc.document_name || "", doc.subject || "")
            };
            setPreviewDoc(docWithContent);
          }
        } catch (err) {
          console.error("Failed to auto-open document preview modal:", err);
        }
      }
    };
    checkOpenDoc();
  }, [location.state, navigate, location.pathname]);

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
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(() => {
    return sessionStorage.getItem("currentChatId") || null;
  });

  useEffect(() => {
    if (currentChatId !== null) {
      sessionStorage.setItem("currentChatId", currentChatId);
    } else {
      sessionStorage.removeItem("currentChatId");
    }
  }, [currentChatId]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await axios.get(`/api/chat/history`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const historyChats = res.data || [];
        const formattedChats = historyChats.map(c => ({
          ...c,
          id: String(c.id),
          messages: (c.messages || []).map(m => ({
            ...m,
            id: String(m.id)
          }))
        }));
        setChats(formattedChats);
        const storedChatId = sessionStorage.getItem("currentChatId");
        if (storedChatId && formattedChats.some(c => c.id === storedChatId)) {
          setCurrentChatId(storedChatId);
        } else if (formattedChats.length > 0) {
          setCurrentChatId(formattedChats[0].id);
        }
      } catch (err) {
        console.error("Lỗi khi tải lịch sử chat:", err);
      }
    };
    fetchHistory();
  }, [user]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const chatInputRef = useRef(null);

  const [aiMessages, setAiMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMode, setAiMode] = useState("Scholar");
  const [useWeb, setUseWeb] = useState(false);
  const [useScholar, setUseScholar] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const toolMenuRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const editInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (chatInputRef.current) {
      if (chatInput === "") {
        chatInputRef.current.style.height = "auto";
      } else {
        chatInputRef.current.style.height = "auto";
        chatInputRef.current.style.height = `${Math.min(chatInputRef.current.scrollHeight, 160)}px`;
      }
    }
  }, [chatInput]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.style.height = "auto";
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
    }
  }, [editingMessageId, editingText]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [aiMessages, isAiTyping]);

  const matchingMessageIds = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const query = chatSearchQuery.toLowerCase();
    return aiMessages
      .filter(m =>
        (m.text && m.text.toLowerCase().includes(query)) ||
        (m.files && m.files.some(f => f.name && f.name.toLowerCase().includes(query)))
      )
      .map(m => m.id);
  }, [aiMessages, chatSearchQuery]);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`chat-message-${msgId}`);
    const container = messagesContainerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      const targetScrollTop = relativeTop - (containerRect.height / 2) + (elRect.height / 2);

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth"
      });

      // Clear highlight from all other messages first
      const highlightedElements = container.querySelectorAll(".ring-purple-500\\/35");
      highlightedElements.forEach(item => {
        item.classList.remove("bg-purple-500/10", "dark:bg-purple-500/20", "ring-1", "ring-purple-500/35");
      });

      // Add visual highlight
      el.classList.add("bg-purple-500/10", "dark:bg-purple-500/20", "ring-1", "ring-purple-500/35");
      setTimeout(() => {
        el.classList.remove("bg-purple-500/10", "dark:bg-purple-500/20", "ring-1", "ring-purple-500/35");
      }, 2000);
    }
  };

  const jumpToMatch = (index) => {
    if (matchingMessageIds.length === 0) return;
    let targetIndex = index;
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= matchingMessageIds.length) targetIndex = matchingMessageIds.length - 1;

    setActiveMatchIndex(targetIndex);

    const matchId = matchingMessageIds[targetIndex];
    scrollToMessage(matchId);
  };

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [chatSearchQuery]);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setAiMessages([]);
    setChatInput("");
    setAttachedFiles([]);
    setRenamingChatId(null);
  };

  const handleSelectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setAiMessages(chat.messages || []);
      setChatInput("");
      setAttachedFiles([]);
      setRenamingChatId(null);

      // Scroll to matched message if search query is active
      if (chatSearchQuery.trim() && chat.messages) {
        const query = chatSearchQuery.toLowerCase();
        const matches = chat.messages.filter(m =>
          (m.text && m.text.toLowerCase().includes(query)) ||
          (m.files && m.files.some(f => f.name && f.name.toLowerCase().includes(query)))
        );
        if (matches.length > 0) {
          setActiveMatchIndex(0);
          setTimeout(() => {
            scrollToMessage(matches[0].id);
          }, 150);
        }
      }
    }
  };

  const togglePinChat = async (chatId, e) => {
    e.stopPropagation();
    const chatToPin = chats.find(c => c.id === chatId);
    if (!chatToPin) return;

    const newPinState = !chatToPin.isPinned;
    const nextChats = chats.map(c => {
      if (c.id === chatId) {
        return { ...c, isPinned: newPinState };
      }
      return c;
    });

    const sortedChats = [...nextChats].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    setChats(sortedChats);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_URL}/api/chat/history/pin/${chatId}`, { isPinned: newPinState }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Lỗi khi ghim cuộc trò chuyện:", err);
      toast.error("Không thể ghim cuộc trò chuyện.");
      if (user) {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await axios.get(`/api/chat/history`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setChats(res.data || []);
      }
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    const chatIdStr = String(chatId);

    // Optimistically remove from list using functional updater to avoid stale closure
    setChats(prev => prev.filter(c => String(c.id) !== chatIdStr));

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.delete(`${API_URL}/api/chat/history/${chatId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      // Reload from server to confirm sync
      const res = await axios.get(`/api/chat/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const formatted = (res.data || []).map(c => ({
        ...c,
        id: String(c.id),
        messages: (c.messages || []).map(m => ({ ...m, id: String(m.id) }))
      }));
      setChats(formatted);
      // Switch to new chat if deleted the current one
      if (String(currentChatId) === chatIdStr) {
        setTimeout(() => handleNewChat(), 50);
      }
    } catch (err) {
      console.error("Lỗi khi xóa cuộc trò chuyện:", err);
      toast.error("Không thể xóa cuộc trò chuyện.");
      // Rollback: reload from server
      if (user) {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await axios.get(`/api/chat/history`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const formatted = (res.data || []).map(c => ({
          ...c,
          id: String(c.id),
          messages: (c.messages || []).map(m => ({ ...m, id: String(m.id) }))
        }));
        setChats(formatted);
      }
    }
  };

  const startRenameChat = (chat, e) => {
    e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenameChatTitle(chat.title);
  };

  const saveRenameChat = async (chatId) => {
    const newTitle = renameChatTitle.trim();
    if (!newTitle) {
      setRenamingChatId(null);
      return;
    }

    const nextChats = chats.map(c => {
      if (c.id === chatId) {
        return { ...c, title: newTitle };
      }
      return c;
    });
    setChats(nextChats);
    setRenamingChatId(null);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_URL}/api/chat/history/rename/${chatId}`, { title: newTitle }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Lỗi khi đổi tên cuộc trò chuyện:", err);
      toast.error("Không thể đổi tên cuộc trò chuyện.");
      if (user) {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await axios.get(`/api/chat/history`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        setChats(res.data || []);
      }
    }
  };

  const saveChatSession = async (chatId, messages, initialTitleText, isNew) => {
    let nextChats;
    let finalTitle = "";

    setChats((prevChats) => {
      if (isNew || !prevChats.some(c => c.id === chatId)) {
        finalTitle = initialTitleText.substring(0, 40) || "Cuộc trò chuyện mới";
        const newChat = {
          id: chatId,
          title: finalTitle,
          messages: messages,
          isPinned: false,
          updatedAt: new Date().toISOString()
        };
        nextChats = [newChat, ...prevChats];
      } else {
        const existingChat = prevChats.find(c => c.id === chatId);
        finalTitle = existingChat ? existingChat.title : (initialTitleText.substring(0, 40) || "Cuộc trò chuyện mới");
        nextChats = prevChats.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: messages,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
      }
      return nextChats;
    });

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.post(`/api/chat/history/save`, {
        id: chatId,
        title: finalTitle || initialTitleText.substring(0, 40) || "Cuộc trò chuyện mới",
        messages: messages
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Lỗi khi lưu cuộc trò chuyện vào database:", err);
    }
  };

  const renderSidebarChatItem = (chat) => {
    const isSelected = currentChatId === chat.id;
    const isRenaming = renamingChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => handleSelectChat(chat.id)}
        className={`group relative flex flex-col items-stretch px-2.5 ${chatSearchQuery.trim() ? "py-1.5" : "py-2"} rounded-lg text-xs transition-colors duration-100 cursor-pointer select-none border antialiased ${isSelected
          ? "bg-purple-600/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20 shadow-sm"
          : "text-slate-650 dark:text-slate-350 border border-transparent hover:bg-white/40 dark:hover:bg-[#0f111a]/30"
          }`}
        style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden" }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <MessageCircle className={`w-4 h-4 shrink-0 ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-500"}`} />

            {isRenaming ? (
              <input
                type="text"
                value={renameChatTitle}
                onChange={(e) => setRenameChatTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveRenameChat(chat.id);
                  } else if (e.key === "Escape") {
                    setRenamingChatId(null);
                  }
                }}
                onBlur={() => saveRenameChat(chat.id)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white dark:bg-slate-950 border border-purple-500 rounded px-1 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            ) : (
              <span className="truncate flex-1 pr-2 font-bold">
                {chat.title || "Cuộc trò chuyện"}
              </span>
            )}
          </div>

          {!isRenaming && (
            <div className="flex items-center gap-1 ml-1 shrink-0 z-10">
              <button
                onClick={(e) => togglePinChat(chat.id, e)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 transition-colors"
                title={chat.isPinned ? "Bỏ ghim" : "Ghim"}
              >
                <Pin className={`w-3 h-3 ${chat.isPinned ? "fill-purple-600 text-purple-600" : ""}`} />
              </button>
              <button
                onClick={(e) => startRenameChat(chat, e)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 transition-colors"
                title="Đổi tên"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-650 dark:hover:text-red-400 transition-colors"
                title="Xóa cuộc trò chuyện"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {chatSearchQuery.trim() && !isRenaming && (() => {
          const query = chatSearchQuery.toLowerCase();

          // 1. Try to find matching text in messages
          const matchingMessage = chat.messages?.find(m =>
            m.text && m.text.toLowerCase().includes(query)
          );
          if (matchingMessage) {
            const text = matchingMessage.text;
            const index = text.toLowerCase().indexOf(query);
            const start = Math.max(0, index - 20);
            const end = Math.min(text.length, index + query.length + 30);
            let snippet = text.substring(start, end);
            if (start > 0) snippet = "..." + snippet;
            if (end < text.length) snippet = snippet + "...";

            return (
              <div className="pl-7 mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 italic truncate text-left">
                {snippet}
              </div>
            );
          }

          // 2. Try to find matching file name
          const matchingFileMessage = chat.messages?.find(m =>
            m.files && m.files.some(f => f.name && f.name.toLowerCase().includes(query))
          );
          if (matchingFileMessage) {
            const matchingFile = matchingFileMessage.files.find(f =>
              f.name && f.name.toLowerCase().includes(query)
            );
            if (matchingFile) {
              return (
                <div className="pl-7 mt-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 italic truncate text-left flex items-center gap-1 select-none">
                  <span>📎 Tệp:</span>
                  <span>{matchingFile.name}</span>
                </div>
              );
            }
          }

          return null;
        })()}
      </div>
    );
  };

  useEffect(() => {
    if (activeTab === "AI Assistant") {
      if (currentChatId) {
        const activeChat = chats.find(c => c.id === currentChatId);
        if (activeChat) {
          setAiMessages(activeChat.messages || []);
          return;
        }
      }
      setAiMessages([]);
    }
  }, [activeTab, currentChatId, chats]);

  const renderModernSearchBar = (isWelcome) => {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendChatMessage();
        }}
        className={`relative flex flex-col bg-white dark:bg-[#131522] border border-slate-200/90 dark:border-slate-800 shadow-sm focus-within:shadow-md transition-all w-full select-none ${attachedFiles.length > 0 ? "rounded-3xl gap-2.5 p-3" : "rounded-full gap-1.5 p-1.5 pl-3"
          }`}
      >
        {/* Attached Files List - Horizontal Cards Inside Search Bar */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 select-none text-left w-full max-w-full custom-scrollbar scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  if (file.isExceededLimit) {
                    toast.error("Không thể tải lên. Tổng số tệp tối đa được hỗ trợ là 10 tệp.");
                  } else {
                    setPreviewDoc({ ...file, hideChat: true });
                  }
                }}
                className={`w-[240px] h-[58px] border rounded-2xl flex items-center justify-between px-3 py-2 gap-3 relative shadow-sm cursor-pointer transition-all duration-200 shrink-0 ${file.isExceededLimit
                  ? "opacity-50 blur-[0.3px] border-red-300 dark:border-red-950/80 bg-red-50/10 dark:bg-red-950/10 hover:bg-red-50/20"
                  : "bg-slate-50/50 dark:bg-slate-900/40 border-purple-300 dark:border-purple-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                  }`}
              >
                {/* Left Mini Icon Badge */}
                <div className="shrink-0">
                  {renderMiniBadge(file.type)}
                </div>

                {/* Center text details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <span
                    className="text-xs font-bold text-slate-855 dark:text-slate-200 leading-none truncate block"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <span className="text-[9.5px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wide mt-1 block">
                    {file.isExceededLimit ? "Lỗi giới hạn" : file.type}
                  </span>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                  {file.isExceededLimit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.error("Không thể tải lên. Tổng số tệp tối đa được hỗ trợ là 10 tệp.");
                      }}
                      className="w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90 shadow-sm"
                      title="Thử lại"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </button>
                  )}
                  {file.isUploading ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" title="Đang xử lý tài liệu...">
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 dark:border-slate-700 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id));
                      }}
                      className="w-5 h-5 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-90 shadow-sm shrink-0 group"
                      title="Xóa tệp"
                    >
                      <X className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300 group-hover:text-purple-700 dark:group-hover:text-purple-200 stroke-[3]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input & Controls Row */}
        <div className="flex items-center gap-2 w-full relative">
          {/* Left Add File button - Gray circular shape to match image */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isAiTyping}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
            title="Tải lên tài liệu"
          >
            <Paperclip className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>

          {/* Input field */}
          <textarea
            ref={chatInputRef}
            placeholder={isWelcome ? "Hỏi bất cứ điều gì về học tập, nghiên cứu..." : "Hỏi tôi bất cứ điều gì..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChatMessage();
              }
            }}
            disabled={isAiTyping}
            rows={1}
            className="flex-grow bg-transparent border-none outline-none text-xs placeholder:text-slate-400 text-slate-855 dark:text-slate-100 py-1.5 px-1.5 resize-none max-h-40 custom-scrollbar leading-relaxed"
            style={{ height: "auto" }}
          />

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAttachFileChange}
            className="hidden"
            multiple
          />

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0 select-none">
            {/* Lavender circular submit button with white airplane icon to match mockup */}
            <button
              type="submit"
              disabled={isAiTyping || isParsingFile || attachedFiles.some(f => f.isUploading) || (!chatInput.trim() && !attachedFiles.some(f => !f.isExceededLimit))}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm shrink-0 ${(chatInput.trim().length > 0 || attachedFiles.some(f => !f.isExceededLimit)) && !isAiTyping && !isParsingFile && !attachedFiles.some(f => f.isUploading)
                ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:scale-105 active:scale-95"
                : "bg-purple-100 dark:bg-slate-800 text-purple-300 dark:text-slate-500 cursor-not-allowed opacity-60"
                }`}
              title="Gửi câu hỏi"
            >
              <Sparkle weight="fill" className="w-3.5 h-3.5" />
            </button>
          </div>


        </div>
      </form>
    );
  };



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
    dob: getSafeYYYYMMDD(user?.dob),
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
      const res = await fetch(`/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: user?.phone || "",
          dob: getSafeYYYYMMDD(user?.dob),
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
        dob: getSafeYYYYMMDD(user?.dob),
        gender: user?.gender || "",
        major: user?.major || ""
      });
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleDobPartChange = (type, value) => {
    let parts = editProfileData.dob ? editProfileData.dob.split("-") : ["", "", ""];
    if (parts.length !== 3) parts = ["2000", "01", "01"];

    let currentYear = parts[0] || "2000";
    let currentMonth = parts[1] || "01";
    let currentDay = parts[2] || "01";

    if (type === "year") currentYear = value;
    if (type === "month") currentMonth = value;
    if (type === "day") currentDay = value;

    const maxDays = getDaysInMonth(parseInt(currentMonth, 10), parseInt(currentYear, 10));
    if (parseInt(currentDay, 10) > maxDays) {
      currentDay = String(maxDays).padStart(2, "0");
    }

    const newDob = `${currentYear}-${currentMonth}-${currentDay}`;
    setEditProfileData(prev => ({
      ...prev,
      dob: newDob
    }));
  };

  const handleSaveProfile = async () => {
    if (editProfileData.phone && editProfileData.phone.trim() !== "") {
      const phoneRegex = /^0(2|3|5|7|8|9)\d{8}$/;
      if (!phoneRegex.test(editProfileData.phone.trim())) {
        toast.error("Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng 0 (VD: 03, 05, 02, 07...).");
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`/api/users/profile`, {
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
          sessionStorage.getItem("user", JSON.stringify(updatedUser));
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
        axios.get(`${API_URL}/api/documents/dashboard?userId=${user.user_id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/documents/bookmarks`, {
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

  const fetchNotifications = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) {
        setNotificationsLoading(true);
      }
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(`/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newNotifs = res.data || [];

      if (isFirstLoad) {
        const seenIds = new Set(newNotifs.map(n => n.notification_id));
        seenNotificationsRef.current = seenIds;
        setNotificationsList(newNotifs);
      } else {
        newNotifs.forEach(notif => {
          if (!seenNotificationsRef.current.has(notif.notification_id)) {
            seenNotificationsRef.current.add(notif.notification_id);
            toast.info(notif.message, {
              action: notif.document_id ? {
                label: "Xem ngay",
                onClick: () => navigate(`/preview/${notif.document_id}`)
              } : undefined,
              duration: 8000
            });
          }
        });
        setNotificationsList(newNotifs);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      if (isFirstLoad) {
        toast.error("Không thể tải danh sách thông báo.");
      }
    } finally {
      if (isFirstLoad) {
        setNotificationsLoading(false);
      }
    }
  };

  const handleApproveAccess = async (notificationId) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(`${API_URL}/api/notifications/${notificationId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || "Đã phê duyệt yêu cầu truy cập!");
      fetchNotifications(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể phê duyệt yêu cầu.");
    }
  };

  const handleDenyAccess = async (notificationId) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(`${API_URL}/api/notifications/${notificationId}/deny`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || "Đã từ chối yêu cầu truy cập.");
      fetchNotifications(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Không thể từ chối yêu cầu.");
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificationsList(prev => prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
      toast.error("Không thể đánh dấu tất cả đã đọc.");
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications(true);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications(false);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [user?.user_id]);

  useEffect(() => {
    if (activeTab === "Notifications") {
      fetchNotifications(false);
    }
  }, [activeTab]);

  // Fetch all subjects from database on mount for searching and selecting
  useEffect(() => {
    if (!user) return;
    const loadSubjects = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await axios.get(`/api/subjects`, {
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
        const response = await axios.get(`${API_URL}/api/tags/subject/${uploadSubject}`, {
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
      const response = await axios.get(`${API_URL}/api/tags/search?q=${val.trim()}`, {
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
        const response = await axios.get(`${API_URL}/api/tags/subject/${editSubject}`, {
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
      const response = await axios.get(`${API_URL}/api/tags/search?q=${val.trim()}`, {
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
      setUploadTitle(file.name.replace(/\.[^/.]+$/, "")); // Also strip extension for cleaner title
    }
  };

  // ── Auto-detect subject from upload title ──────────────────────────────────
  useEffect(() => {
    if (!uploadTitle || !subjectsList || subjectsList.length === 0) return;
    // Don't auto-detect if the user has already manually selected a real subject
    if (uploadSubject && uploadSubject !== "OTHER" && uploadSubject !== "Chọn môn học") return;

    const timeoutId = setTimeout(() => {
      const titleLower = uploadTitle.toLowerCase();

      // 1. Check for exact code match (e.g. SWP391, SWP 391, SWP-391)
      // Capture letters and numbers separately, allowing optional space, underscore, or dash in between
      const codeMatch = uploadTitle.match(/(?:^|[^A-Za-z0-9])([A-Za-z]{2,4})[\s_\-]?(\d{2,4})(?:[^A-Za-z0-9]|$)/);
      if (codeMatch) {
        const code = (codeMatch[1] + codeMatch[2]).toUpperCase();
        const found = subjectsList.find(s => s.subject_code === code);
        if (found && uploadSubject !== found.subject_code) {
          setUploadSubject(found.subject_code);
          return;
        }
      }

      // 2. Check if title contains subject name
      const foundByName = subjectsList.find(s => {
        if (!s.subject_name || s.subject_name.length < 4) return false;
        return titleLower.includes(s.subject_name.toLowerCase());
      });

      if (foundByName && uploadSubject !== foundByName.subject_code) {
        setUploadSubject(foundByName.subject_code);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [uploadTitle, subjectsList, uploadSubject]);

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
      await axios.delete(`${API_URL}/api/documents/${docId}?userId=${user.user_id}`, {
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

    let fileToUpload = uploadParams?.fileToUpload || selectedFile;
    let finalTitle = uploadParams?.finalTitle || uploadTitle.trim();
    let finalSubject = uploadParams?.subject !== undefined ? uploadParams.subject : uploadSubject;
    let finalTags = uploadParams?.tags !== undefined ? uploadParams.tags : documentTags;

    if (!finalTitle) {
      toast.warning("Vui lòng điền tiêu đề tài liệu!");
      return;
    }
    if (!fileToUpload) {
      toast.warning("Vui lòng chọn một tệp để tải lên!");
      return;
    }

    if (!forceProceed) {
      const isDuplicateFile = documents.some(doc => {
        if (!doc.file_url) return false;
        const decodedUrl = decodeURIComponent(doc.file_url);
        return decodedUrl.endsWith(`/${fileToUpload.name}`);
      });

      const isDuplicateTitle = documents.some(doc => doc.title.toLowerCase() === finalTitle.toLowerCase());

      if (isDuplicateFile || isDuplicateTitle) {
        setDuplicateConfirmData({
          isFileDuplicate: isDuplicateFile,
          isTitleDuplicate: isDuplicateTitle,
          file: fileToUpload,
          title: finalTitle,
          quickUploadSubject: uploadParams?.subject,
          quickUploadTags: uploadParams?.tags
        });
        return;
      }
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setUploadProgress(1);

    // Simulate smooth progress up to 90%
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        const increment = Math.max(1, Math.floor((90 - prev) / 10));
        return prev + increment;
      });
    }, 300);

    try {
      // 1. Upload to Supabase Storage
      const uploadResult = await uploadFileToSupabase(fileToUpload, "AIStudyHub", user.user_id);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Lỗi khi tải tệp lên Supabase Storage.");
      }

      // 2. Save metadata to backend API
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.post(`/api/documents/upload`, {
        user_id: user.user_id,
        subject: finalSubject || null,
        title: finalTitle,
        description: finalSubject
          ? `Tài liệu môn ${finalSubject} tự tải lên lưu trữ trên hệ thống`
          : "Tài liệu tự do tự tải lên lưu trữ trên hệ thống",
        file_url: uploadResult.fileUrl,
        file_size: fileToUpload.size,
        file_type: fileToUpload.name.split(".").pop().toUpperCase(),
        visibility: user.role === "LECTURER" ? uploadVisibility : "PRIVATE",
        tags: finalTags // Pass selected tags array!
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const savedData = response.data;

      setTimeout(async () => {
        setIsUploading(false);
        isUploadingRef.current = false;
        setUploadProgress(0);
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
      }, 500); // 500ms delay before hiding to let user see 100%
    } catch (err) {
      clearInterval(progressInterval);
      setIsUploading(false);
      isUploadingRef.current = false;
      setUploadProgress(0);
      console.error("Upload failed with error details:", err);
      const errMsg = err.response?.data?.error || err.message || "Tải lên tệp không thành công.";
      toast.error(`Lỗi tải lên: ${errMsg}`);
    }
  };

  const handleQuickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isUploadingRef.current) {
      toast.warning("Đang có tiến trình tải lên khác, vui lòng chờ!");
      return;
    }
    const finalTitle = file.name.replace(/\.[^/.]+$/, "");

    setSelectedFile(file);
    setUploadTitle(finalTitle);
    setUploadSubject(personalSelectedFolder);
    setDocumentTags([]);

    // Cuộn lên đầu trang để người dùng thấy form Upload
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (quickUploadInputRef.current) {
      quickUploadInputRef.current.value = "";
    }
  };

  // Send AI Chat Message action
  const handleSendChatMessage = async (textToSend, filesOverride) => {
    if (isParsingFile || attachedFiles.some(f => f.isUploading)) {
      toast.warning("Vui lòng đợi tài liệu tải lên hoàn tất trước khi gửi tin nhắn.");
      return;
    }

    const text = textToSend !== undefined ? textToSend : chatInput;
    const rawTargetFiles = filesOverride !== undefined ? filesOverride : attachedFiles;
    const targetFiles = rawTargetFiles.filter(f => !f.isExceededLimit && !f.isUploading);
    if (!text.trim() && targetFiles.length === 0) return;

    const finalQueryText = text.trim() || `Phân tích tài liệu: ${targetFiles.map(f => f.name).join(", ")}`;

    // Generate or use currentChatId
    let activeId = currentChatId;
    let isNew = false;
    if (!activeId) {
      activeId = String(Date.now());
      setCurrentChatId(activeId);
      isNew = true;
    }
    // Add user message
    const userMsg = {
      id: String(Date.now()),
      sender: "user",
      text: text.trim() ? finalQueryText : "",
      files: targetFiles
    };
    const updatedMessagesWithUser = [...aiMessages, userMsg];
    setAiMessages(updatedMessagesWithUser);
    saveChatSession(activeId, updatedMessagesWithUser, finalQueryText, isNew);

    setChatInput("");
    setAttachedFiles([]);

    setIsAiTyping(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const documentIds = targetFiles.map(f => f.documentId).filter(Boolean);

      const payload = {
        message: finalQueryText,
        history: aiMessages,
        aiMode: documentIds.length > 0 ? "UPLOADED_DOCUMENT" : aiMode, // Override to force local search if files are attached
        documentId: documentIds.length > 0 ? documentIds[0] : null,
        documentIds: documentIds,
        useWeb: useWeb,
        useScholar: useScholar,
        deepResearch: deepResearch,
        documentContext: targetFiles.length > 0
          ? targetFiles.map(file => `--- TẬP TIN: ${file.name} ---\n${file.content}`).join("\n\n")
          : ""
      };

      const res = await axios.post(`/api/chat`, payload, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const aiMsg = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: res.data.response || "Không nhận được phản hồi từ AI.",
        suggestedDocs: res.data.suggestedDocs || []
      };

      setAiMessages((prev) => {
        const next = [...prev, aiMsg];
        saveChatSession(activeId, next, finalQueryText, false);
        return next;
      });
    } catch (err) {
      console.error("AI assistant chat error:", err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi kết nối đến máy chủ AI.";
      const errMsgObj = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: `❌ **Lỗi Kết Nối:** ${errMsg}`
      };
      setAiMessages((prev) => {
        const next = [...prev, errMsgObj];
        saveChatSession(activeId, next, finalQueryText, false);
        return next;
      });
      toast.error("Trò chuyện AI thất bại.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleRetryUserMessage = async (msgId) => {
    const msgIndex = aiMessages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const targetQuery = aiMessages[msgIndex].text;
    const historyUpToTarget = aiMessages.slice(0, msgIndex);

    const updatedMessages = aiMessages.slice(0, msgIndex + 1);
    setAiMessages(updatedMessages);

    setIsAiTyping(true);
    let activeId = currentChatId;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const payload = {
        message: targetQuery,
        history: historyUpToTarget,
        aiMode: aiMode,
        useWeb: useWeb,
        useScholar: useScholar,
        deepResearch: deepResearch,
        documentContext: ""
      };

      const msgFiles = aiMessages[msgIndex].files || [];
      if (msgFiles.length > 0) {
        payload.documentContext = msgFiles.map(file => `--- TẬP TIN: ${file.name} ---\n${file.content}`).join("\n\n");
      }

      const res = await axios.post(`/api/chat`, payload, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const aiMsg = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: res.data.response || "Không nhận được phản hồi từ AI."
      };

      setAiMessages((prev) => {
        const next = [...prev, aiMsg];
        saveChatSession(activeId, next, targetQuery, false);
        return next;
      });
    } catch (err) {
      console.error("AI assistant chat retry error:", err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi kết nối đến máy chủ AI.";
      const errMsgObj = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: `❌ **Lỗi Kết Nối:** ${errMsg}`
      };
      setAiMessages((prev) => {
        const next = [...prev, errMsgObj];
        saveChatSession(activeId, next, targetQuery, false);
        return next;
      });
      toast.error("Trò chuyện AI thất bại.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSaveEditMessage = async (msgId) => {
    if (!editingText.trim()) return;

    const msgIndex = aiMessages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const targetQuery = editingText.trim();
    const historyUpToTarget = aiMessages.slice(0, msgIndex);

    const updatedMessages = aiMessages.slice(0, msgIndex + 1);
    updatedMessages[msgIndex] = {
      ...updatedMessages[msgIndex],
      text: targetQuery
    };

    setAiMessages(updatedMessages);
    setEditingMessageId(null);
    setEditingText("");

    setIsAiTyping(true);
    let activeId = currentChatId;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      const payload = {
        message: targetQuery,
        history: historyUpToTarget,
        aiMode: aiMode,
        useWeb: useWeb,
        useScholar: useScholar,
        deepResearch: deepResearch,
        documentContext: ""
      };

      const msgFiles = updatedMessages[msgIndex].files || [];
      if (msgFiles.length > 0) {
        payload.documentContext = msgFiles.map(file => `--- TẬP TIN: ${file.name} ---\n${file.content}`).join("\n\n");
      }

      const res = await axios.post(`/api/chat`, payload, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const aiMsg = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: res.data.response || "Không nhận được phản hồi từ AI.",
        suggestedDocs: res.data.suggestedDocs || []
      };

      setAiMessages((prev) => {
        const next = [...prev, aiMsg];
        saveChatSession(activeId, next, targetQuery, false);
        return next;
      });
    } catch (err) {
      console.error("AI assistant chat edit error:", err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi kết nối đến máy chủ AI.";
      const errMsgObj = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: `❌ **Lỗi Kết Nối:** ${errMsg}`
      };
      setAiMessages((prev) => {
        const next = [...prev, errMsgObj];
        saveChatSession(activeId, next, targetQuery, false);
        return next;
      });
      toast.error("Trò chuyện AI thất bại.");
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle temporary file attachment
  const handleAttachFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentValidCount = attachedFiles.filter(f => !f.isExceededLimit).length;
    const filesToUpload = [];
    const exceededFiles = [];

    files.forEach((file, index) => {
      if (currentValidCount + filesToUpload.length < 10) {
        filesToUpload.push(file);
      } else {
        exceededFiles.push({
          id: Date.now() + Math.random() + index,
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop().toUpperCase() || "FILE",
          content: "",
          isExceededLimit: true
        });
      }
    });

    if (exceededFiles.length > 0) {
      toast.warning(`Đã vượt quá giới hạn 10 tệp. ${exceededFiles.length} tệp vượt hạn sẽ bị lỗi giới hạn và có nút thử lại.`);
    }

    if (filesToUpload.length === 0) {
      if (exceededFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...exceededFiles]);
      }
      e.target.value = "";
      return;
    }

    setIsParsingFile(true);
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    // Tạo placeholder cho UI để hiện file đang tải lên (vòng tròn loading)
    const placeholders = filesToUpload.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop().toUpperCase() || "FILE",
      content: "",
      isUploading: true
    }));

    // Cập nhật UI ngay lập tức
    setAttachedFiles((prev) => [...prev, ...exceededFiles, ...placeholders]);

    try {
      const errors = [];

      await Promise.all(
        filesToUpload.map(async (file, index) => {
          const placeholder = placeholders[index];
          try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await axios.post(`/api/chat/upload-temp`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
                "Authorization": `Bearer ${token}`
              }
            });

            // Cập nhật đúng file đã tải xong, xóa trạng thái isUploading
            setAttachedFiles((prev) => prev.map(f => {
              if (f.id === placeholder.id) {
                return {
                  id: f.id,
                  name: res.data.fileName,
                  size: res.data.fileSize,
                  type: res.data.fileType,
                  content: res.data.extractedText,
                  documentId: res.data.documentId,
                  chatMode: res.data.chatMode
                };
              }
              return f;
            }));
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
            const errMsg = err.response?.data?.error || err.message || "Không thể tải lên.";
            errors.push(`${file.name}: ${errMsg}`);
            // Gỡ bỏ file khỏi giao diện nếu bị lỗi
            setAttachedFiles((prev) => prev.filter(f => f.id !== placeholder.id));
          }
        })
      );

      if (errors.length > 0) {
        toast.error(`Một số tệp tải lên thất bại:\n${errors.join("\n")}`);
      }
    } catch (err) {
      console.error("File parsing failed:", err);
      toast.error("Đã xảy ra lỗi khi xử lý tệp.");
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  // Get prompt chips based on file attachment
  const getPromptChips = () => {
    if (attachedFiles.length === 0) {
      return [
        { text: "Giải thích về môn học Thiết kế Web (WED202c)", label: "Cấu trúc WED202c" },
        { text: "Tóm tắt thuật toán Dijkstra tìm đường đi ngắn nhất", label: "Giải thuật Dijkstra" },
        { text: "Tầm quan trọng của Đại số tuyến tính trong học máy", label: "Đại số tuyến tính & AI" }
      ];
    }

    const hasZip = attachedFiles.some(file => file.type === "ZIP");
    if (hasZip) {
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
      { text: "Hãy tạo danh sách các câu hỏi tự luận để ôn tập kiến thức từ tài liệu này.", label: "Tạo câu hỏi ôn tập" }
    ];
  };

  // Helper to render a single text segment with markdown (bold, bullets, headings, inline links)
  const renderTextSegment = (text, key) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div key={key} className="w-full text-left font-medium select-text selection:bg-purple-500/20 whitespace-pre-wrap leading-relaxed break-words">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          let isHeader = false;
          let headerLevel = 0;
          let cleanLine = line;

          const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
          const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");

          if (headerMatch) {
            isHeader = true;
            headerLevel = headerMatch[1].length;
            cleanLine = headerMatch[2];
          } else if (isBullet) {
            cleanLine = trimmed.substring(2);
          }

          const segments = cleanLine.split(/(\*\*.*?\*\*)/g);
          const formattedLine = segments.map((seg, segIdx) => {
            if (seg.startsWith("**") && seg.endsWith("**")) {
              return <strong key={segIdx} className="font-extrabold text-black dark:text-white">{seg.slice(2, -2)}</strong>;
            }
            return seg;
          });

          if (isHeader) {
            const headerClasses =
              headerLevel === 1 ? "block text-sm font-black text-slate-900 dark:text-white mt-3 mb-1" :
                headerLevel === 2 ? "block text-[13px] font-extrabold text-slate-900 dark:text-white mt-2.5 mb-1" :
                  headerLevel === 3 ? "block text-xs font-extrabold text-slate-850 dark:text-slate-100 mt-2 mb-1" :
                    "block text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 mb-0.5";
            return (
              <span key={lineIdx} className={`${headerClasses} select-text`}>
                {formattedLine}
                {lineIdx < lines.length - 1 ? "\n" : ""}
              </span>
            );
          }

          if (isBullet) {
            return (
              <span key={lineIdx} className="block pl-5 select-text">
                • {formattedLine}
                {lineIdx < lines.length - 1 ? "\n" : ""}
              </span>
            );
          }

          return (
            <span key={lineIdx} className="select-text">
              {formattedLine}
              {lineIdx < lines.length - 1 ? "\n" : ""}
            </span>
          );
        })}
      </div>
    );
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    // Step 1: Split by code blocks first
    const codeParts = text.split(/(```[\s\S]*?```)/g);
    const renderedParts = [];

    codeParts.forEach((part, partIndex) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);
        renderedParts.push(
          <pre key={`code-${partIndex}`} className="bg-slate-950 text-slate-100 font-mono text-[11px] p-3 rounded-lg overflow-x-auto my-2 border border-slate-800 text-left w-full select-text selection:bg-purple-500/30">
            {language && <div className="text-[9px] uppercase text-purple-400 font-extrabold tracking-wider border-b border-white/5 pb-1 mb-1.5">{language}</div>}
            <code>{code.trim()}</code>
          </pre>
        );
        return;
      }

      // Step 2: For non-code segments, extract document links
      const docSegments = extractDocumentLinks(part);
      const hasDocLinks = docSegments.some(s => s.type === 'doclink');

      if (!hasDocLinks) {
        // No doc links — render as normal text
        renderedParts.push(renderTextSegment(part, `text-${partIndex}`));
        return;
      }

      // Has doc links — render text + doc cards inline
      // Collect all docIds for a grouped card section at end if multiple
      const textBeforeCards = [];
      const docIds = [];

      docSegments.forEach((seg, segIdx) => {
        if (seg.type === 'text') {
          textBeforeCards.push(renderTextSegment(seg.content, `seg-text-${partIndex}-${segIdx}`));
        } else if (seg.type === 'doclink') {
          docIds.push(seg.docId);
        }
      });

      // Render the text parts first
      renderedParts.push(...textBeforeCards);

      // Then render a grouped document cards section
      if (docIds.length > 0) {
        renderedParts.push(
          <div key={`doc-cards-${partIndex}`} className="flex flex-col gap-2 my-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest select-none mb-1">
              <BookOpen className="w-3 h-3" />
              <span>Tài liệu được gợi ý</span>
            </div>
            {docIds.map((id, i) => (
              <InlinedDocumentCard
                key={`doc-${partIndex}-${i}-${id}`}
                docId={id}
                onPreview={(doc) => {
                  const docWithContent = {
                    ...doc,
                    simulated_content: doc.description || '',
                    hideChat: true
                  };
                  setPreviewDoc(docWithContent);
                }}
              />
            ))}
          </div>
        );
      }
    });

    return renderedParts;
  };

  const [isResettingPasswordWithOtp, setIsResettingPasswordWithOtp] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState("");

  const handleSendResetEmail = async () => {
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!user || !user.email) {
      setChangePasswordError("Không tìm thấy địa chỉ email liên kết với tài khoản.");
      return;
    }

    try {
      setResetEmailLoading(true);
      const response = await fetch(`/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });

      const data = await response.json();

      if (response.ok) {
        setChangePasswordSuccess(`Mã xác thực OTP đã được gửi đến email: ${user.email}. Vui lòng kiểm tra hộp thư, sau đó nhập mã OTP và mật khẩu mới bên dưới để hoàn tất.`);
        setIsResettingPasswordWithOtp(true);
        setResetOtpCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setChangePasswordError(data.error || "Gửi email xác thực thất bại.");
      }
    } catch (err) {
      setChangePasswordError("Không thể kết nối đến máy chủ để gửi email xác thực.");
    } finally {
      setResetEmailLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!resetOtpCode || !newPassword || !confirmNewPassword) {
      setChangePasswordError("Vui lòng điền đầy đủ mã OTP và mật khẩu mới.");
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
      const response = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          token: resetOtpCode,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setChangePasswordSuccess("Mật khẩu học tập của bạn đã được cập nhật thành công!");
        setIsResettingPasswordWithOtp(false);
        setResetOtpCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setChangePasswordError(data.error || "Đặt lại mật khẩu thất bại.");
      }
    } catch (err) {
      setChangePasswordError("Không thể kết nối đến máy chủ để đặt lại mật khẩu.");
    } finally {
      setChangePasswordLoading(false);
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
      const response = await fetch(`/api/auth/change-password`, {
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
    { name: "Home", icon: HomeIcon, label: t("dashboard.tabs.home") || "Tổng quan học tập" },
    { name: "Document Management", icon: FolderOpen, label: t("dashboard.tabs.my_documents") || "Kho học liệu cá nhân" },
    { name: "Bookmarks", icon: Heart, label: t("dashboard.tabs.bookmarks") || "Tài liệu Yêu thích" },
    { name: "AI Assistant", icon: Bot, label: t("dashboard.ai_assistant") || "Trợ lý Nghiên cứu AI" },
    { name: "Community", icon: Users, label: t("dashboard.tabs.community") || "Cộng đồng" }
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
      {/* Processing Overlay */}
      {processingDocId && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm transition-all duration-300">
          <Loader className="w-10 h-10 text-purple-600 dark:text-purple-400 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Đang xử lý...</p>
        </div>
      )}

      {/* Gentle Liquid Glass Floating Background Circles */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[55%] rounded-full bg-purple-500/8 dark:bg-purple-550/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-500/4 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] left-[20%] w-[45%] h-[45%] rounded-full bg-purple-500/6 dark:bg-purple-950/15 blur-[150px] pointer-events-none z-0" />

      {/* Floating Role Filter Sidebar strictly on the right side next to the scrollbar */}
      {activeTab === "Community" && communityFilterMode === "ALL" && selectedCommunitySubjectCode && (
        <div className={`fixed right-0 z-[9999] flex flex-col items-end gap-2.5 bg-transparent select-none transition-all duration-500 ease-in-out ${isScrolledDown ? "top-[110px] translate-y-0" : "top-1/2 -translate-y-1/2"
          }`}>
          <button
            onClick={() => {
              setCommunityRoleFilter(prev => prev === "STUDENT" ? "ALL" : "STUDENT");
              setTimeout(() => {
                if (communitySearchSectionRef.current && mainContentRef.current) {
                  const mainTop = mainContentRef.current.getBoundingClientRect().top;
                  const searchTop = communitySearchSectionRef.current.getBoundingClientRect().top;
                  const targetScrollTop = mainContentRef.current.scrollTop + (searchTop - mainTop) - 24;
                  mainContentRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }}
            className={`px-3 py-3 rounded-l-[16px] text-xs font-black tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center justify-center text-center h-[48px] border border-r-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] whitespace-nowrap ${communityRoleFilter === "STUDENT"
              ? "bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-500 text-white scale-105 w-[160px]"
              : "bg-white/95 dark:bg-[#090b16]/95 border-slate-200/50 dark:border-white/10 text-slate-650 dark:text-slate-355 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/60 dark:hover:bg-[#090b16]/60 w-[130px]"
              }`}
          >
            {language === "vi" ? "Sinh viên" : "Student"}
          </button>
          <button
            onClick={() => {
              setCommunityRoleFilter(prev => prev === "LECTURER" ? "ALL" : "LECTURER");
              setTimeout(() => {
                if (communitySearchSectionRef.current && mainContentRef.current) {
                  const mainTop = mainContentRef.current.getBoundingClientRect().top;
                  const searchTop = communitySearchSectionRef.current.getBoundingClientRect().top;
                  const targetScrollTop = mainContentRef.current.scrollTop + (searchTop - mainTop) - 24;
                  mainContentRef.current.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                  });
                }
              }, 100);
            }}
            className={`px-3 py-3 rounded-l-[16px] text-xs font-black tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center justify-center text-center h-[48px] border border-r-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] whitespace-nowrap ${communityRoleFilter === "LECTURER"
              ? "bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-500 text-white scale-105 w-[160px]"
              : "bg-white/95 dark:bg-[#090b16]/95 border-slate-200/50 dark:border-white/10 text-slate-655 dark:text-slate-355 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/60 dark:hover:bg-[#090b16]/60 w-[130px]"
              }`}
          >
            {language === "vi" ? "Giảng viên" : "Lecturer"}
          </button>
        </div>
      )}
      <aside className={`h-full bg-white/35 dark:bg-[#0f111a]/40 backdrop-blur-xl border-r border-slate-200/40 dark:border-white/5 flex flex-col p-5 shrink-0 justify-between select-none z-10 shadow-[inset_-1px_0_0_rgba(255,255,255,0.25)] dark:shadow-none rounded-r-2xl transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-[76px] px-3.5" : "w-68"
        }`}>
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar">

          {/* Logo Brand Header & Toggle Button */}
          <div className={`flex items-center py-0.5 min-w-0 ${isSidebarCollapsed ? "justify-center w-full" : "justify-between px-1.5"}`}>
            <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? "justify-center w-full" : "gap-2.5"}`}>
              {isSidebarCollapsed ? (
                <button
                  onClick={toggleSidebar}
                  title="Mở rộng menu"
                  className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white transition-colors cursor-pointer shrink-0 mx-auto"
                >
                  <Menu className="w-4.5 h-4.5" />
                </button>
              ) : (
                <img src="/logo.png" alt="AIStudyHub Logo" className="w-8 h-8 object-contain shrink-0" />
              )}
              <div className={`flex flex-col transition-all duration-300 ease-in-out origin-left truncate ${isSidebarCollapsed ? "opacity-0 max-w-0 scale-90 pointer-events-none overflow-hidden" : "opacity-100 max-w-[180px] scale-100"
                }`}>
                <span className="text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase leading-none">AIStudyHub</span>
                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mt-0.5">Academic Portal</span>
              </div>
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Thu gọn menu"
                className="w-7.5 h-7.5 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User mini profile card */}
          <div className="relative flex justify-center w-full" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className={`flex items-center rounded-xl border transition-all duration-300 ease-in-out focus:outline-none cursor-pointer w-full h-12 ${isSidebarCollapsed
                ? "px-[7px] py-[7px] bg-transparent border-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800/40"
                : "border-slate-200/40 dark:border-white/5 bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-md hover:bg-white/65 dark:hover:bg-[#0f111a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] p-2.5 justify-between text-left"
                }`}
            >
              <div className="flex items-center min-w-0">
                <div className="relative w-8.5 h-8.5 shrink-0">
                  <div className={`w-full h-full rounded-xl flex items-center justify-center font-extrabold text-purple-700 dark:text-purple-300 overflow-hidden shadow-sm transition-all duration-300 ${user?.avatar_url ? "bg-transparent" : "bg-purple-100 dark:bg-purple-950/50"
                    }`}>
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      fullName.charAt(0)
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-[#151722] z-10" />
                </div>
                <div className={`flex flex-col transition-all duration-300 ease-in-out origin-left ${isSidebarCollapsed
                  ? "opacity-0 max-w-0 scale-90 pointer-events-none overflow-hidden ml-0"
                  : "opacity-100 max-w-[150px] scale-100 ml-2.5"
                  }`}>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate whitespace-nowrap">{fullName}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-none mt-1 whitespace-nowrap">
                    {user?.role === "ADMIN" ? (language === "vi" ? "Quản trị viên" : "Admin") : user?.role === "LECTURER" ? (language === "vi" ? "Giảng viên" : "Lecturer") : (language === "vi" ? "Học viên" : "Student")}
                  </span>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-all duration-300 shrink-0 ${isSidebarCollapsed
                ? "opacity-0 w-0 h-0 scale-90 pointer-events-none overflow-hidden"
                : "opacity-100 w-3.5 h-3.5 scale-100 ml-auto"
                }`} />
            </button>

            {showProfileDropdown && (
              <div className={`absolute p-1 bg-white/85 dark:bg-[#0f111a]/90 backdrop-blur-lg border border-slate-200/40 dark:border-white/10 rounded-xl shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150 ${isSidebarCollapsed ? "bottom-12 left-12 w-48" : "top-full left-0 right-0 mt-1.5"
                }`}>
                {isSidebarCollapsed && (
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 select-none">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{fullName}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                      {user?.role === "ADMIN" ? (language === "vi" ? "Quản trị viên" : "Admin") : user?.role === "LECTURER" ? (language === "vi" ? "Giảng viên" : "Lecturer") : (language === "vi" ? "Học viên" : "Student")}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors mt-0.5"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav.logout") || "Đăng xuất"}
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
                  onClick={() => {
                    setActiveTab(item.name);
                    if (item.name === "AI Assistant") {
                      setCurrentChatId(null);
                      setAiMessages([]);
                      setShowChatSidebar(false);
                      setSidebarWidth(230);
                      setChatSearchQuery("");
                    }
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-xl text-xs font-bold transition-all duration-300 ease-in-out cursor-pointer select-none focus:outline-none w-full h-11 px-3.5 justify-start ${isActive
                    ? "bg-purple-600/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-purple-500/20"
                    : "text-slate-500 dark:text-slate-450 border border-transparent hover:bg-white/40 dark:hover:bg-[#0f111a]/30 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-all duration-300 ease-in-out ${isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-450 dark:text-slate-500"}`} />
                  <span className={`inline-block transition-all duration-300 ease-in-out origin-left truncate ${isSidebarCollapsed ? "opacity-0 max-w-0 ml-0 scale-90 pointer-events-none overflow-hidden" : "opacity-100 max-w-[180px] ml-3 scale-100"
                    }`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Clean Storage Overview */}
        <div className="flex flex-col gap-4">
          {user?.role !== "ADMIN" && (
            isSidebarCollapsed ? (
              <div
                className="relative group flex items-center justify-center w-11 h-11 rounded-xl text-slate-550 hover:text-[#10B981] dark:text-slate-450 dark:hover:text-purple-400 transition-all duration-305 ease-in-out cursor-pointer mx-auto"
                title={`${language === "vi" ? "Dung lượng" : "Storage"}: ${percentage.toFixed(0)}% (${usageInGB} GB / ${limitInGB} GB)`}
              >
                <Cloud className="w-5 h-5 shrink-0" />
                <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-white dark:bg-slate-800 text-[#10B981] px-1 rounded-md border border-slate-200/40 dark:border-white/5 shadow-sm">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-white/30 dark:bg-[#0f111a]/35 border border-slate-200/40 dark:border-white/5 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-in-out overflow-hidden">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> {language === "vi" ? "Dung lượng" : "Storage"}</span>
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
            )
          )}



                  <div className="relative flex justify-center w-full" ref={settingsDropdownRef}>
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              title={isSidebarCollapsed ? (t("dashboard.tabs.settings") || "Cài đặt & Bảo mật") : undefined}
              className={`flex items-center justify-between rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-[#0f111a]/30 border border-transparent hover:border-slate-200/20 dark:hover:border-white/5 transition-all duration-300 ease-in-out focus:outline-none w-full h-11 px-3.5`}
            >
              <div className="flex items-center min-w-0">
                <Settings className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                <span className={`inline-block transition-all duration-300 ease-in-out origin-left truncate ${isSidebarCollapsed ? "opacity-0 max-w-0 ml-0 scale-90 pointer-events-none overflow-hidden" : "opacity-100 max-w-[180px] ml-3 scale-100"
                  }`}>{t("dashboard.tabs.settings") || "Cài đặt & Bảo mật"}</span>
              </div>
              <ChevronDown className={`text-slate-400 transition-all duration-300 shrink-0 ${isSidebarCollapsed
                ? "opacity-0 w-0 h-0 scale-90 pointer-events-none overflow-hidden"
                : "opacity-100 w-3.5 h-3.5 scale-100 ml-auto"
                } ${showSettingsDropdown ? "rotate-180" : ""}`} />
            </button>
            
            {showSettingsDropdown && (
              <div className={`absolute p-1 bg-white/85 dark:bg-[#0f111a]/90 backdrop-blur-lg border border-slate-200/40 dark:border-white/10 rounded-xl shadow-lg z-50 animate-in fade-in-50 slide-in-from-bottom-2 duration-150 ${isSidebarCollapsed ? "bottom-12 left-12 w-48" : "bottom-full left-0 right-0 mb-1.5"
                }`}>
                <button
                  onClick={() => {
                    setActiveTab("History");
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-655 dark:text-slate-355 hover:text-[#10B981] hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  {t("dashboard.tabs.history") || "Lịch sử xem"}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("Notifications");
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-655 dark:text-slate-355 hover:text-[#10B981] hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer mt-0.5"
                >
                  <Bell className="w-4 h-4 text-slate-400" />
                  {t("dashboard.tabs.notifications") || "Thông báo học thuật"}
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={() => {
                    setActiveTab("Personal Profile");
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-655 dark:text-slate-355 hover:text-[#10B981] hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  {t("dashboard.tabs.profile") || "Hồ sơ & Bảo mật"}
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="flex items-center gap-2.5 text-xs font-bold text-slate-655 dark:text-slate-355">
                    <Globe size={16} className="text-slate-400" /> {language === "vi" ? "Ngôn ngữ" : "Language"}
                  </span>
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg select-none">
                    <button
                      type="button"
                      onClick={() => setLanguage("vi")}
                      className={`h-6 px-2 text-[10px] font-black rounded-md transition-all duration-300 cursor-pointer ${language === "vi"
                        ? "bg-purple-600 dark:bg-purple-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent"
                        }`}
                    >
                      VI
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`h-6 px-2 text-[10px] font-black rounded-md transition-all duration-300 cursor-pointer ${language === "en"
                        ? "bg-purple-600 dark:bg-purple-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent"
                        }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main ref={mainContentRef} className="flex-1 h-full overflow-y-auto flex flex-col p-6 md:p-8 gap-6 bg-transparent z-10">

        {/* ── SCREEN 1: HOME (DASHBOARD) ── */}
        {activeTab === "Home" && (
          <HomeDashboard
            user={user}
            fullName={fullName}
            documents={documents}
            bookmarkedDocs={bookmarkedDocs}
            notificationsList={notificationsList}
            setActiveTab={setActiveTab}
            language={language}
            t={t}
            handleSendChatMessage={handleSendChatMessage}
            fileInputRef={fileInputRef}
            handleApproveAccess={handleApproveAccess}
            handleDenyAccess={handleDenyAccess}
            handleMarkAsRead={handleMarkAsRead}
            handlePreviewClick={handlePreviewClick}
          />
        )}

        {/* 🔹 SCREEN: HISTORY 🔹 */}
        {activeTab === "History" && (
          <HistoryPage
            user={user}
            onPreview={handlePreviewClick}
          />
        )}

        {/* ── SCREEN 2: DOCUMENT MANAGEMENT (Real On-Storage Upload) ── */}
        {activeTab === "Document Management" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{t("myDocs.section_label") || "Bộ lưu trữ của bạn"}</span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1" style={{ color: "#000" }}>
                {t("myDocs.title") || "Kho học liệu cá nhân (On-Storage)"}
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                {t("myDocs.subtitle") || "Mọi tài liệu tải lên sẽ được ghi nhận và lưu trữ trực tiếp vào cơ sở dữ liệu hệ thống."}
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
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("myDocs.file_label") || "Tệp tài liệu học tập *"}</label>

                      {!selectedFile ? (
                        <div
                          onClick={() => document.getElementById("file-picker-input").click()}
                          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-300 group"
                        >
                          <input
                            id="file-picker-input"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <div className="flex flex-col items-center gap-1.5">
                            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-purple-500 transition-colors" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t("myDocs.file_drag") || "Kéo thả tệp hoặc nhấp để chọn tệp tài liệu"}</span>
                            <span className="text-[10px] text-slate-400">{t("myDocs.file_formats") || "Hỗ trợ mọi định dạng tệp (Tối đa 10MB)"}</span>
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
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("myDocs.title_label") || "Tiêu đề học liệu *"}</label>
                        <Input
                          type="text"
                          placeholder={t("myDocs.title_placeholder") || "Ví dụ: Đề cương tự ôn thi cuối học kỳ"}
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
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("myDocs.subject_label") || "Chọn học phần"}</label>
                        <div
                          onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                          className="bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus-within:ring-1 focus-within:ring-purple-500 font-bold cursor-pointer h-10 flex items-center justify-between select-none"
                        >
                          <span className="truncate pr-2">
                            {uploadSubject === "OTHER"
                              ? (t("myDocs.subject_other") || "Môn học khác (OTHER)")
                              : uploadSubject === "Chọn môn học"
                                ? (language === "vi" ? "Chọn môn học" : "Select Subject")
                                : uploadSubject
                                  ? `${uploadSubject} - ${subjectsList.find(s => s.subject_code === uploadSubject)?.subject_name || "Môn học"}`
                                  : (t("myDocs.subject_no_select") || "Không chọn học phần (Để trống)")}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>

                        {showSubjectDropdown && (
                          <div className="absolute top-[100%] left-0 right-0 mt-0.0 max-h-60 overflow-y-auto bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 flex flex-col gap-2">
                            {/* Subject search input */}
                            <Input
                              type="text"
                              placeholder={t("myDocs.subject_search") || "Tìm học phần..."}
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
                                  ? "bg-purple-600/10 text-purple-600 dark:text-purple-400"
                                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                              >
                                <span>{t("myDocs.subject_none") || "-- Không chọn học phần (Để trống) --"}</span>
                              </button>
                              {subjectsList.filter(sub =>
                                sub.subject_code.toLowerCase().includes(subjectSearchInput.toLowerCase()) ||
                                sub.subject_name.toLowerCase().includes(subjectSearchInput.toLowerCase())
                              ).length === 0 ? (
                                <div className="flex flex-col gap-1 p-1">
                                  <span className="text-[10px] text-slate-400 font-bold italic text-center py-1">{t("myDocs.subject_not_found") || "Không tìm thấy học phần"}</span>
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
                                      <span>{t("myDocs.subject_add_new") || "+ Thêm mã môn mới:"} "{subjectSearchInput.trim().toUpperCase()}"</span>
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
                                      <span>{t("myDocs.subject_add_new") || "+ Thêm mã môn mới:"} "{subjectSearchInput.trim().toUpperCase()}"</span>
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

                    {/* Visibility Selection for Lecturer */}
                    {user?.role === "LECTURER" && (
                      <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/50 pt-4 relative">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          {t("myDocs.visibility_label") || "Phạm vi chia sẻ (Giảng viên)"}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            onClick={() => setUploadVisibility("PRIVATE")}
                            className={`flex items-center p-2.5 border rounded-xl cursor-pointer transition-all ${uploadVisibility === "PRIVATE"
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                              : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                              }`}
                          >
                            <div className={`p-1.5 rounded-lg mr-2.5 ${uploadVisibility === "PRIVATE" ? "bg-purple-200 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
                              <Lock size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900 dark:text-white">{t("myDocs.vis_private") || "Cá nhân"}</p>
                              <p className="text-[9px] text-slate-500">{t("myDocs.vis_private_desc") || "Chỉ mình tôi"}</p>
                            </div>
                          </div>

                          <div
                            onClick={() => setUploadVisibility("PUBLIC")}
                            className={`flex items-center p-2.5 border rounded-xl cursor-pointer transition-all ${uploadVisibility === "PUBLIC"
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                              : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                              }`}
                          >
                            <div className={`p-1.5 rounded-lg mr-2.5 ${uploadVisibility === "PUBLIC" ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                              <Globe size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900 dark:text-white">{t("myDocs.vis_public") || "Cộng đồng"}</p>
                              <p className="text-[9px] text-slate-500">{t("myDocs.vis_public_desc") || "Tất cả sinh viên"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tag Editor Component */}
                    <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/50 pt-4 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-purple-500" />
                          {t("myDocs.tags_label") || "Gắn thẻ học liệu (Tags)"}
                        </label>
                        <span className="text-[9px] text-slate-400 font-bold">{t("myDocs.tags_hint") || "Thêm nhiều tag để dễ tìm kiếm"}</span>
                      </div>

                      {/* Active Tags list */}
                      <div className="flex flex-wrap gap-1.5">
                        {documentTags.length === 0 ? (
                          <span className="text-[11px] text-slate-400 font-bold italic py-1">{t("myDocs.tags_empty") || "Chưa chọn tag nào cho tài liệu"}</span>
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
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t("myDocs.tags_search_label") || "Tìm kiếm & chọn tag học tập"}</span>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder={t("myDocs.tags_placeholder") || "Nhấn để xem gợi ý hoặc tìm kiếm tag..."}
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
                            {t("myDocs.tags_add_btn") || "Thêm"}
                          </Button>
                        </div>

                        {/* Floating Dropdown Suggestions */}
                        {showTagSuggestions && (
                          <div className="absolute bottom-[100%] left-0 right-0 mb-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1">
                            {tagSearchInput.trim() ? (
                              /* Search Suggestions from DB */
                              searchSuggestions.filter(t => !documentTags.includes(t)).length === 0 ? (
                                <span className="text-[10px] text-slate-400 font-bold italic text-center py-2">
                                  {t("myDocs.tags_not_found") || 'Không tìm thấy tag trùng khớp. Nhấn "Thêm" để tạo mới.'}
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
                                  {t("myDocs.tags_no_suggestions") || "Không còn tag gợi ý. Bạn có thể tự gõ tag mới."}
                                </span>
                              ) : (
                                <>
                                  <span className="text-[9px] font-bold text-slate-455 dark:text-slate-500 px-2 py-1 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">{t("myDocs.tags_suggest_for") || "Gợi ý cho môn"} {uploadSubject}</span>
                                  {suggestedTags.filter(t => !documentTags.includes(t)).map(tag => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onMouseDown={() => handleAddTag(tag)}
                                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
                                    >
                                      <span>{tag}</span>
                                      <span className="text-[9px] font-bold text-purple-600 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/10">{t("myDocs.tags_select") || "+ Chọn"}</span>
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
                        <span>{t("myDocs.upload_info") || "Hỗ trợ định dạng PDF, PowerPoint, Word. Dung lượng khuyến nghị < 10MB"}</span>
                      </div>

                      <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white font-extrabold text-xs px-5 py-4.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <UploadCloud className="w-4 h-4" />
                        {isUploading ? (t("myDocs.uploading") || "Đang xử lý lưu trữ...") : (t("myDocs.upload_btn") || "Lưu vào máy chủ")}
                      </Button>
                    </div>

                    {/* Loading state bar */}
                    {isUploading && (
                      <div className="w-full flex flex-col gap-2 mt-2">
                        <div className="flex justify-between text-[10px] font-extrabold text-purple-600 dark:text-purple-400">
                          <span>{t("myDocs.upload_progress") || "Đang mã hóa & ghi nhận vào cơ sở dữ liệu học thuật..."}</span>
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
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "#000" }}>
                          <Calendar className="w-4 h-4 text-purple-500" />
                          {t("myDocs.calendar_title") || "Lịch sử tải lên cá nhân"}
                        </h3>
                        {personalRangeStart && (
                          <button
                            type="button"
                            onClick={() => {
                              setPersonalRangeStart(null);
                              setPersonalRangeEnd(null);
                            }}
                            className="text-[9px] font-black text-purple-600 hover:text-purple-800 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            {t("myDocs.calendar_clear") || "Xóa lọc"}
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
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-355 uppercase tracking-widest">
                            {language === "vi" ? monthNamesVi[uploadCalMonth] : new Date(uploadCalYear, uploadCalMonth).toLocaleDateString("en-US", { month: "long" })}, {uploadCalYear}
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
                          {(t("dashboard.calendar.weekdays") || weekdaysVi).map(day => (
                            <span key={day} className="text-[9px] font-extrabold text-slate-400 dark:text-slate-655">
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
                        <div className="text-[10px] font-black text-slate-700 dark:text-slate-355">{t("myDocs.calendar_legend") || "Chú thích tài liệu tải lên:"}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{t("myDocs.legend_lt5") || "< 5 tài liệu"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span>{t("myDocs.legend_lt10") || "< 10 tài liệu"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                            <span>{t("myDocs.legend_lt20") || "< 20 tài liệu"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{t("myDocs.legend_gte20") || ">= 20 tài liệu"}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>


            {/* Documents filtering & Grid */}
            {(() => {
              const groupedPersonalDocs = {};
              filteredDocuments.forEach(doc => {
                const subj = doc.subject_code || "OTHER";
                if (!groupedPersonalDocs[subj]) groupedPersonalDocs[subj] = [];
                groupedPersonalDocs[subj].push(doc);
              });

              const isSearching = searchQuery.trim().length > 0 || selectedSubjectFilter !== "All" || personalRangeStart;

              let docsToShow = filteredDocuments;
              let currentFolderName = null;

              if (personalSelectedFolder && !isSearching) {
                currentFolderName = `Môn: ${personalSelectedFolder}`;
                docsToShow = groupedPersonalDocs[personalSelectedFolder] || [];
              }

              return (
                <section ref={documentsSectionRef} className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    <div className="flex items-center gap-3">
                      {personalSelectedFolder && !isSearching && (
                        <>
                          <button
                            onClick={() => {
                              if (window.history.state && window.history.state.view === 'folder') {
                                window.history.back();
                              } else {
                                setPersonalSelectedFolder(null);
                              }
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                            title="Quay lại danh mục"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>


                        </>
                      )}
                      <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "#000" }}>
                        <span className="w-1 h-3.5 bg-purple-600 dark:bg-purple-500 rounded" />
                        {personalSelectedFolder && !isSearching && currentFolderName
                          ? `${t("myDocs.docs_title") || "Tài liệu đã tải lên"} - ${currentFolderName}`
                          : `${t("myDocs.docs_title") || "Tài liệu đã tải lên"} (${isSearching ? `${filteredDocuments.length}/${documents.length}` : documents.length})`}
                      </h2>
                    </div>

                    {/* Search & Filters */}
                    <div className="relative z-20 flex flex-col sm:flex-row items-center gap-4">
                      <SearchBar
                        search={searchQuery}
                        setSearch={setSearchQuery}
                        className="w-full sm:w-[250px]"
                      />

                      <div className="flex items-center gap-2 relative">
                        <span className="text-xs font-bold text-slate-500">{t("myDocs.filter_by") || "Lọc theo:"}</span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSortMenu(!showSortMenu);
                          }}
                          className="flex items-center gap-2 bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                        >
                          <span>
                            {sortConfig.key === "upload_date" && sortConfig.direction === "desc" && (t("myDocs.sort_upload_desc") || "Ngày tải lên (Mới nhất)")}
                            {sortConfig.key === "upload_date" && sortConfig.direction === "asc" && (t("myDocs.sort_upload_asc") || "Ngày tải lên (Cũ nhất)")}
                            {sortConfig.key === "file_size" && sortConfig.direction === "desc" && (t("myDocs.sort_size_desc") || "Kích cỡ (Lớn nhất)")}
                            {sortConfig.key === "file_size" && sortConfig.direction === "asc" && (t("myDocs.sort_size_asc") || "Kích cỡ (Nhỏ nhất)")}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        {showSortMenu && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                          >
                            {[
                              { label: t("myDocs.sort_upload_desc") || "Ngày tải lên (Mới nhất)", key: "upload_date", direction: "desc" },
                              { label: t("myDocs.sort_upload_asc") || "Ngày tải lên (Cũ nhất)", key: "upload_date", direction: "asc" },
                              { label: t("myDocs.sort_size_desc") || "Kích cỡ (Lớn nhất)", key: "file_size", direction: "desc" },
                              { label: t("myDocs.sort_size_asc") || "Kích cỡ (Nhỏ nhất)", key: "file_size", direction: "asc" }
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
                          {t("myDocs.filter_single") || "Đang lọc tài liệu tải lên"}{" "}
                          {!personalRangeEnd || personalRangeStart.getTime() === personalRangeEnd.getTime() ? (
                            <>{t("myDocs.filter_single") || "ngày"} <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeStart)}</span></>
                          ) : (
                            <>{t("myDocs.filter_from") || "từ ngày"} <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeStart)}</span> {t("myDocs.filter_to") || "đến ngày"} <span className="underline decoration-purple-400 font-extrabold">{formatToDDMMYYYY(personalRangeEnd)}</span></>
                          )}{" "}
                          ({filteredDocuments.length} {t("myDocs.filter_count") || "tài liệu"})
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
                  {!personalSelectedFolder && !isSearching && Object.keys(groupedPersonalDocs).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {Object.entries(groupedPersonalDocs).map(([subj, docs]) => (
                        <div
                          key={subj}
                          onClick={() => {
                            setPersonalSelectedFolder(subj);
                            setDocManagePage(1);
                            window.history.pushState({ view: 'folder', subj }, "");
                          }}
                          className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-purple-500 hover:shadow-lg transition-all group flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-50 group-hover:bg-purple-100 dark:bg-purple-950/30 dark:group-hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center transition-colors">
                              <FolderOpen className="w-6 h-6" />
                            </div>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full">
                              {docs.length} tài liệu
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{subj}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {subjectsList?.find(s => s.subject_code === subj)?.subject_name || (language === "vi" ? "Môn học khác" : "Other Subject")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full">
                      <table className="w-full text-left border-collapse text-xs select-none">
                        <thead>
                          <tr className="border-b border-slate-200/30 dark:border-white/5 bg-slate-100/30 dark:bg-white/5 text-slate-450 dark:text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                            <th className="px-5 py-3.5">{t("myDocs.col_title") || "Tiêu đề học liệu"}</th>
                            <th className="px-5 py-3.5">{t("myDocs.col_subject") || "Môn học"}</th>
                            <th className="px-5 py-3.5">{t("myDocs.col_author") || "Tác giả"}</th>
                            <th className="px-5 py-3.5">{t("myDocs.col_date") || "Ngày lưu trữ"}</th>
                            <th className="px-5 py-3.5">{t("myDocs.col_size") || "Dung lượng"}</th>
                            <th className="px-5 py-3.5 text-right">{t("myDocs.col_options") || "Tùy chọn"}</th>
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
                          ) : docsToShow.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-5 py-0">
                                <div className="flex flex-col items-center justify-center py-16 gap-5 select-none">
                                  {/* Illustrated icon */}
                                  <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/60 dark:to-purple-900/20 border border-purple-200/60 dark:border-purple-800/30 flex items-center justify-center shadow-sm">
                                      <svg className="w-10 h-10 text-purple-400 dark:text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                      </svg>
                                    </div>
                                    {/* floating dot decorations */}
                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-400/30 dark:bg-purple-500/30 animate-pulse" />
                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-violet-400/40 dark:bg-violet-500/30 animate-pulse delay-300" />
                                  </div>

                                  {/* Text */}
                                  <div className="flex flex-col items-center gap-1.5 text-center max-w-xs">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                      {searchQuery || selectedSubjectFilter !== "All"
                                        ? (t("myDocs.empty_title_search") || "Không tìm thấy tài liệu phù hợp")
                                        : (t("myDocs.empty_title") || "Kho học liệu của bạn đang trống")}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                      {searchQuery || selectedSubjectFilter !== "All"
                                        ? "Thử thay đổi từ khóa hoặc bộ lọc để tìm tài liệu khác."
                                        : "Điền thông tin bên trên và nhấn \"Lưu vào máy chủ\" để tải tài liệu đầu tiên lên kho học liệu cá nhân."}
                                    </span>
                                  </div>

                                  {/* CTA – only shown when truly empty (no filters) */}
                                  {!searchQuery && selectedSubjectFilter === "All" && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/10 dark:bg-purple-500/10 border border-purple-300/30 dark:border-purple-500/20 text-xs font-bold text-purple-600 dark:text-purple-400">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                        <polyline points="3 12 3 18" />
                                      </svg>
                                      {t("myDocs.empty_cta") || "Kéo lên phía trên để bắt đầu tải học liệu"}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            docsToShow.slice((docManagePage - 1) * 9, docManagePage * 9).map((doc) => (
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
                                      ref={(el) => {
                                        if (!el) return;
                                        const rect = el.getBoundingClientRect();
                                        const viewportH = window.innerHeight;
                                        if (rect.bottom > viewportH - 10) {
                                          el.style.top = "auto";
                                          el.style.bottom = "2.5rem";
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-5 top-10 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                                    >

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          if (doc.file_url) {
                                            (async () => {
                                              try {
                                                const response = await fetch(doc.file_url);
                                                if (!response.ok) throw new Error("Network response was not ok");
                                                const blob = await response.blob();
                                                const blobUrl = URL.createObjectURL(blob);

                                                const link = document.createElement("a");
                                                link.href = blobUrl;
                                                const urlExt = doc.file_url.split('.').pop().split('?')[0] || "pdf";
                                                const cleanTitle = (doc.title || "download").endsWith("." + urlExt)
                                                  ? (doc.title || "download")
                                                  : `${doc.title || "download"}.${urlExt}`;
                                                link.download = cleanTitle;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(blobUrl);
                                              } catch (error) {
                                                console.error("Direct download failed, falling back to new tab:", error);
                                                window.open(doc.file_url, "_blank");
                                              }
                                            })();
                                          } else {
                                            toast.error(t("myDocs.toast_download_fail") || "Không tìm thấy đường dẫn tải xuống!");
                                          }
                                        }}
                                        className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                      >
                                        <Download className="w-4 h-4 text-slate-400" />
                                        {t("myDocs.download") || "Tải xuống"}
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
                                        {t("myDocs.share") || "Chia sẻ"}
                                      </button>

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
                                        {t("myDocs.edit") || "Chỉnh sửa"}
                                      </button>

                                      {doc.is_community ? (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(null);
                                            setProcessingDocId(doc.document_id || doc.id);
                                            try {
                                              const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                                              await axios.put(`${API_URL}/api/documents/${doc.document_id || doc.id}/unshare`, {}, {
                                                headers: { Authorization: `Bearer ${token}` }
                                              });
                                              toast.success(t("myDocs.toast_unpost_success") || "Đã hủy đăng tài liệu khỏi cộng đồng!");
                                              setDocuments(prev => prev.map(d => ((d.document_id && d.document_id === doc.document_id) || (d.id && d.id === doc.id)) ? { ...d, is_community: false } : d));
                                            } catch (err) {
                                              toast.error(t("myDocs.toast_unpost_fail") || "Không thể hủy đăng tài liệu khỏi cộng đồng.");
                                            } finally {
                                              setProcessingDocId(null);
                                            }
                                          }}
                                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                        >
                                          <Globe className="w-4 h-4 text-red-500" />
                                          {t("myDocs.unpost") || "Hủy đăng cộng đồng"}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(null);
                                            setProcessingDocId(doc.document_id || doc.id);
                                            try {
                                              const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                                              await axios.put(`${API_URL}/api/documents/${doc.document_id || doc.id}/share`, {}, {
                                                headers: { Authorization: `Bearer ${token}` }
                                              });
                                              toast.success(t("myDocs.toast_post_success") || "Đã đăng tài liệu lên cộng đồng thành công!");
                                              setDocuments(prev => prev.map(d => ((d.document_id && d.document_id === doc.document_id) || (d.id && d.id === doc.id)) ? { ...d, is_community: true } : d));
                                            } catch (err) {
                                              toast.error(t("myDocs.toast_post_fail") || "Không thể đăng tài liệu lên cộng đồng.");
                                            } finally {
                                              setProcessingDocId(null);
                                            }
                                          }}
                                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-purple-650 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-md transition-colors"
                                        >
                                          <Globe className="w-4 h-4 text-purple-500" />
                                          {t("myDocs.post_community") || "Đăng lên cộng đồng"}
                                        </button>
                                      )}
                                      {/* <button
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
                                </button> */}

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
                                        {t("myDocs.remove") || "Gỡ bỏ"}
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
                  )}
                  {(personalSelectedFolder || isSearching || Object.keys(groupedPersonalDocs).length === 0) && Math.ceil(docsToShow.length / 9) > 1 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination
                        page={docManagePage}
                        totalPages={Math.ceil(docsToShow.length / 9)}
                        setPage={setDocManagePage}
                      />
                    </div>
                  )}
                </section>
              );
            })()}
          </div>
        )}

        {activeTab === "Bookmarks" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{t("bookmarks.section_label") || "Bộ sưu tập của bạn"}</span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1 flex items-center gap-2" style={{ color: "#000" }}>
                {t("bookmarks.title") || "Tài liệu Yêu thích"}
                <Heart className="w-6 h-6 fill-red-500 text-red-500" />
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                {t("bookmarks.subtitle") || "Các tài liệu hay từ cộng đồng mà bạn đã đánh dấu."}
              </span>
            </header>

            <section className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "#000" }}>
                  <span className="w-1 h-3.5 bg-red-500 rounded" />
                  {t("bookmarks.found") || "Danh mục yêu thích"} ({bookmarkedDocs.length})
                </h2>
              </div>

              <div className="w-full flex flex-col space-y-6">
                {bookmarkedDocs.length === 0 ? (
                  <div className="text-center py-20 bg-white/30 dark:bg-[#0f111a]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                    <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">
                      <Heart className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-slate-850 dark:text-slate-200 m-0">
                      {t("bookmarks.empty_title") || "Bạn chưa yêu thích tài liệu nào"}
                    </p>
                    <p className="text-xs text-slate-450 mt-2 m-0">
                      {t("bookmarks.empty_desc") || "Hãy quay lại cộng đồng và thả tim những tài liệu hữu ích nhé."}
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
                          onBookmarkChange={(docId, isBookmarked) => {
                            if (!isBookmarked) {
                              setBookmarkedDocs(prev => prev.filter(d => String(d.document_id || d.id) !== String(docId)));
                            }
                          }}
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
          <div className="flex-1 flex flex-row min-h-0 bg-transparent relative h-[calc(100vh-145px)] min-h-[580px] w-full animate-spring-up">
            {/* 1. SIDEBAR (Collapsible) */}
            <div
              id="ai-chat-sidebar"
              className={`h-full bg-slate-50/40 dark:bg-[#07080c]/45 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden relative ${isResizing ? "" : "transition-all duration-300 ease-in-out"
                } ${showChatSidebar ? "border border-slate-200/40 dark:border-slate-850/60 rounded-2xl" : "border-0"
                }`}
              style={{ width: showChatSidebar ? `${sidebarWidth}px` : "0px" }}
            >
              <div
                className="h-full flex flex-col shrink-0"
                style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
              >
                {/* Sidebar Header/Search */}
                <div className="pt-3 pb-3 px-2.5 flex flex-col gap-3 shrink-0 border-b border-slate-200/40 dark:border-slate-800/60">
                  {/* Close Button Row */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatSidebar(false);
                        setSidebarWidth(230);
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131522] text-slate-500 hover:text-purple-600 transition-colors shadow-sm cursor-pointer flex items-center justify-center shrink-0"
                      title="Ẩn danh sách"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                  </div>

                  {/* New Chat Button Row */}
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none cursor-pointer"
                  >
                    <SquarePen className="w-4 h-4" />
                    <span className="truncate">{t("aiChat.new_chat") || "Cuộc trò chuyện mới"}</span>
                  </button>



                  {/* Search Past Chats */}
                  <div className="relative w-full flex items-center bg-white dark:bg-[#0f111a] border border-slate-200/60 dark:border-slate-850 rounded-xl px-3 py-1.5 focus-within:border-purple-500/50 transition-colors">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                    <input
                      type="text"
                      placeholder={t("aiChat.search_placeholder") || "Tìm cuộc hội thoại..."}
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-[11px] placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                    />
                    {chatSearchQuery && (
                      <button
                        onClick={() => setChatSearchQuery("")}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-black/5 shrink-0 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Session List */}
                <div className={`flex-1 overflow-y-auto px-1.5 pb-1.5 flex flex-col gap-1 custom-scrollbar ${chatSearchQuery.trim() ? "pt-2" : "pt-2.5"}`}>
                  {(() => {
                    const filtered = chats.filter(c => {
                      const query = chatSearchQuery.toLowerCase();
                      const matchesTitle = c.title.toLowerCase().includes(query);
                      const matchesMessages = c.messages && c.messages.some(m =>
                        m.text && m.text.toLowerCase().includes(query)
                      );
                      const matchesFiles = c.messages && c.messages.some(m =>
                        m.files && m.files.some(f => f.name && f.name.toLowerCase().includes(query))
                      );
                      return matchesTitle || matchesMessages || matchesFiles;
                    });

                    const pinned = filtered.filter(c => c.isPinned);
                    const others = filtered.filter(c => !c.isPinned);

                    return (
                      <>
                        {pinned.length > 0 && (
                          <div className="mb-2">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block px-2.5 mb-1.5 select-none">
                              {t("aiChat.history") || "Đã ghim"}
                            </span>
                            <div className="flex flex-col gap-1">
                              {pinned.map(renderSidebarChatItem)}
                            </div>
                          </div>
                        )}

                        <div>
                          {others.length > 0 && !chatSearchQuery.trim() && (
                            <span className={`text-[9px] font-black text-slate-450 uppercase tracking-widest block px-2.5 mb-1.5 select-none ${pinned.length > 0 ? "mt-2" : ""}`}>
                              Gần đây
                            </span>
                          )}
                          {filtered.length === 0 ? (
                            <div className="text-center py-8 text-[10px] font-bold text-slate-400">
                              Không tìm thấy cuộc trò chuyện nào
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {others.map(renderSidebarChatItem)}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Resize Handle */}
              {showChatSidebar && (
                <div
                  onMouseDown={startResizing}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/40 active:bg-purple-500/60 transition-all duration-150 z-30 flex items-center justify-center group"
                >
                  <div className="w-[2px] h-8 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Toggle Sidebar Button (Only shown when sidebar is hidden) */}
            {!showChatSidebar && (
              <button
                type="button"
                onClick={() => {
                  setShowChatSidebar(true);
                  setSidebarWidth(230);
                }}
                className="absolute left-3.5 top-3.5 z-25 p-2.5 rounded-lg border bg-white dark:bg-[#131522] border-slate-200 dark:border-slate-800 text-slate-500 hover:text-purple-600 transition-colors shadow-sm select-none cursor-pointer flex items-center justify-center animate-in fade-in zoom-in duration-200"
                title="Hiện danh sách"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">

              {/* If welcome screen (messages length is empty) */}
              {aiMessages.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center max-w-2xl w-full mx-auto px-6 pb-20 animate-spring-up select-none">
                  {/* Premium Sparkles Logo (Transparent Frame, Purple-to-Pink Gradient Icon) */}
                  <div className="w-24 h-24 flex items-center justify-center mb-0 select-none">
                    <svg
                      className="w-24 h-24 select-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="url(#sparkles-grad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <defs>
                        <linearGradient id="sparkles-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <path d="M9.93 10.93L12 4l2.07 6.93L21 13l-6.93 2.07L12 22l-2.07-6.93L3 13l6.93-2.07z" />
                      <path d="M19 5l.7 2.3L22 8l-2.3.7-.7 2.3-.7-2.3L16 8l2.3-.7L19 5z" />
                    </svg>
                  </div>

                  <h1 className="text-3xl md:text-[38px] font-extrabold tracking-tight mt-8 mb-8 text-center leading-[1.15] select-none" style={{ color: "#000" }}>
                    {t("aiChat.placeholder") || "Hôm nay bạn muốn nghiên cứu gì?"}
                  </h1>

                  {/* Large Welcome Search Bar */}
                  <div className="w-full max-w-xl">
                    {renderModernSearchBar(true)}
                  </div>
                </div>
              ) : (
                /* Active Chat View */
                <div className="flex-1 flex flex-col justify-between p-6 min-h-0 h-full w-full max-w-3xl mx-auto relative">
                  {/* Floating Search Navigator */}
                  {matchingMessageIds.length > 0 && (
                    <div className="absolute top-8 right-8 z-30 bg-white dark:bg-[#131522] border border-slate-200/90 dark:border-slate-800 rounded-full px-3.5 py-1.5 flex items-center gap-3 shadow-md select-none animate-in slide-in-from-top-3 duration-250 border-purple-500/20">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {activeMatchIndex + 1} / {matchingMessageIds.length} kết quả
                      </span>
                      <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => jumpToMatch(activeMatchIndex - 1)}
                          disabled={activeMatchIndex === 0}
                          className="p-1 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          title="Lên"
                        >
                          <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => jumpToMatch(activeMatchIndex + 1)}
                          disabled={activeMatchIndex === matchingMessageIds.length - 1}
                          className="p-1 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          title="Xuống"
                        >
                          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Messages Log */}
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto mb-4 bg-transparent flex flex-col gap-6 custom-scrollbar pr-2 scroll-smooth">
                    {aiMessages.map((msg) => {
                      const isAi = msg.sender === "ai";

                      if (isAi) {
                        const { cleanText, sources } = extractSources(msg.text);
                        return (
                          <div key={msg.id} id={`chat-message-${msg.id}`} className="flex flex-col gap-2.5 self-start w-full text-left transition-all duration-500 rounded-lg p-1.5">
                            {/* Message Content (Clean text, no container) */}
                            <div className="text-xs text-slate-855 dark:text-slate-200 leading-relaxed font-medium">
                              {renderMessageText(cleanText)}
                            </div>

                            {/* Sources Section */}
                            {sources.length > 0 && (
                              <div className="mt-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 animate-in fade-in duration-200">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 select-none">
                                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Nguồn tài liệu tham khảo</span>
                                </div>
                                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent custom-scrollbar max-w-full">
                                  {sources.map((src, idx) => (
                                    <a
                                      key={idx}
                                      href={src.url || "#"}
                                      target={src.url ? "_blank" : undefined}
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 w-40 p-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-150 dark:border-slate-850 rounded-xl transition-all flex flex-col justify-between group"
                                    >
                                      <div>
                                        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider mb-0.5">
                                          {getSourceIcon(src.source)}
                                          <span className="text-slate-550 dark:text-slate-400 ml-1">{src.source}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-250 line-clamp-2 leading-tight group-hover:text-purple-600 transition-colors">
                                          {src.title}
                                        </p>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions Row matching mockup */}
                            <div className="flex items-center gap-4 mt-1 select-none text-slate-450 dark:text-slate-500">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(cleanText);
                                  toast.success("Đã sao chép phản hồi vào bộ nhớ tạm!");
                                }}
                                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Sao chép"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {msg.text && msg.text.includes("Lỗi Kết Nối") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const errIndex = aiMessages.findIndex(m => m.id === msg.id);
                                    if (errIndex !== -1) {
                                      const precedingUserMsg = aiMessages
                                        .slice(0, errIndex)
                                        .reverse()
                                        .find(m => m.sender === "user");
                                      if (precedingUserMsg) {
                                        handleRetryUserMessage(precedingUserMsg.id);
                                      } else {
                                        toast.error("Không tìm thấy câu hỏi trước đó để thử lại!");
                                      }
                                    }
                                  }}
                                  className="hover:text-purple-600 transition-colors cursor-pointer"
                                  title="Thử lại"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        const isEditing = editingMessageId === msg.id;
                        return (
                          <div key={msg.id} id={`chat-message-${msg.id}`} className="flex flex-col items-end self-end max-w-[85%] gap-2 transition-all duration-500 rounded-lg p-1.5 w-fit">
                            {/* User Text Bubble (Clean slate/gray theme) */}
                            {isEditing ? (
                              <div className="w-[600px] max-w-full bg-[#F4F4F5] dark:bg-[#27272A] p-3 rounded-2xl border border-purple-500/30 flex flex-col gap-2 text-left shadow-sm">
                                <textarea
                                  ref={editInputRef}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-100 resize-none font-semibold leading-relaxed whitespace-pre-wrap break-all"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMessageId(null)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditMessage(msg.id)}
                                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
                                  >
                                    Lưu & Gửi
                                  </button>
                                </div>
                              </div>
                            ) : (
                              msg.text && (
                                <div className="bg-[#F4F4F5] dark:bg-[#27272A] text-slate-800 dark:text-slate-100 px-4 py-2 rounded-2xl text-xs text-left leading-relaxed font-semibold shadow-sm whitespace-pre-wrap break-all w-fit max-w-full">
                                  {msg.text}
                                </div>
                              )
                            )}

                            {/* User Message Actions */}
                            {!isEditing && msg.text && (
                              <div className="flex items-center gap-4 mt-1 select-none text-slate-450 dark:text-slate-500 pr-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.text);
                                    toast.success("Đã sao chép tin nhắn vào bộ nhớ tạm!");
                                  }}
                                  className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Sao chép"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingText(msg.text);
                                  }}
                                  className="hover:text-purple-600 transition-colors cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRetryUserMessage(msg.id);
                                  }}
                                  className="hover:text-purple-600 transition-colors cursor-pointer"
                                  title="Thử lại"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Attached Files Grid in Chat Log - Gemini Style */}
                            {msg.files && msg.files.length > 0 && (
                              <div className="flex flex-wrap gap-2.5 justify-end mt-1.5 select-none">
                                {msg.files.map((file) => {
                                  const type = (file.type || "").toLowerCase();
                                  let typeColor = "text-slate-500";
                                  if (type === "pdf") typeColor = "text-red-600";
                                  else if (["xls", "xlsx", "excel"].includes(type)) typeColor = "text-emerald-600";
                                  else if (["doc", "docx"].includes(type)) typeColor = "text-blue-600";
                                  else if (["ppt", "pptx"].includes(type)) typeColor = "text-orange-550";
                                  else if (["zip", "rar"].includes(type)) typeColor = "text-amber-600";
                                  else if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) typeColor = "text-indigo-650";

                                  return (
                                    <div
                                      key={file.id}
                                      onClick={() => setPreviewDoc({ ...file, hideChat: true })}
                                      className="w-28 h-28 p-3.5 flex flex-col justify-between rounded-2xl bg-[#f3f4f6]/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:scale-[1.02] transition-transform duration-200 cursor-pointer text-left"
                                    >
                                      {/* Top extension text */}
                                      <span className={`text-[10px] font-black uppercase tracking-wider ${typeColor}`}>
                                        {file.type || "FILE"}
                                      </span>

                                      {/* Bottom file name */}
                                      <span
                                        className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-3 break-all"
                                        title={file.name}
                                      >
                                        {file.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                    })}

                    {isAiTyping && (
                      <div className="flex items-center gap-2.5 self-start w-full animate-pulse">
                        <img src="/logo.png" alt="AI" className="w-5 h-5 object-contain shrink-0 animate-bounce" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">...</span>
                      </div>
                    )}
                  </div>

                  {/* Search bar inside active chat */}
                  <div className="w-full select-none">
                    {renderModernSearchBar(false)}
                  </div>
                </div>
              )}
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
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{language === "vi" ? "Cộng đồng học tập" : "Learning Community"}</span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1" style={{ color: "#000" }}>
                  {t("community.title") || "Tài liệu chia sẻ cộng đồng"}
                </h1>
                <span className="text-xs text-slate-500 font-medium mt-1">
                  {t("community.subtitle") || "Tìm kiếm và tham khảo toàn bộ tài liệu chia sẻ từ các học viên khác trên toàn hệ thống."}
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
                        <h2 className="text-xl font-bold" style={{ color: "#000" }}>{t("community.my_contributions") || "Tài liệu bạn đã chia sẻ"}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{(t("community.contrib_desc") || "Bạn đã đóng góp {count} tài liệu cho cộng đồng").replace("{count}", mySharedCommunityDocs.length)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCommunityFilterMode("MY_SHARED")}
                      className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      {t("community.view_all") || "Xem tất cả"}
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
                    <BookOpen size={24} /> {t("community.all_shared_docs") || "Toàn bộ bài bạn đã chia sẻ"} ({mySharedCommunityDocs.length})
                  </h2>
                  <button
                    onClick={() => setCommunityFilterMode("ALL")}
                    className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
                  >
                    {t("community.back_to_library") || "Quay lại thư viện chung"}
                  </button>
                </div>
              )}

              {/* Search and Date Filter Section - hidden in MY_SHARED mode */}
              {communityFilterMode !== "MY_SHARED" && (
              <div ref={communitySearchSectionRef} className="relative z-30 w-full max-w-2xl mx-auto flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <SearchBar
                    search={communitySearch}
                    setSearch={setCommunitySearch}
                    userId={user?.user_id || null}
                    onSearch={(keyword) => {
                      setCommunitySearch(keyword);
                      setCommunityPage(1);
                    }}
                    placeholder={t("community.search_placeholder") || "Tìm kiếm tài liệu cộng đồng, môn học, tác giả..."}
                    resultCount={communitySearch ? filteredCommunityDocs.length : null}
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
                        ? "bg-purple-600 border-purple-600 text-white shadow-purple-500/10"
                        : "bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border-slate-200/30 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#0f111a]/60 hover:text-purple-600 dark:hover:text-purple-400"
                      }
                    `}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">
                      {rangeStart ? (
                        rangeEnd && rangeStart.toDateString() !== rangeEnd.toDateString() ? (
                          `${rangeStart.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "numeric", month: "numeric" })} - ${rangeEnd.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "numeric", month: "numeric" })}`
                        ) : (
                          rangeStart.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "numeric", month: "numeric" })
                        )
                      ) : (
                        t("community.filter_date") || "Lọc ngày"
                      )}
                    </span>
                  </button>

                  {rangeStart && (
                    <button
                      onClick={() => {
                        setRangeStart(null);
                        setRangeEnd(null);
                      }}
                      title={language === "vi" ? "Xóa bộ lọc ngày" : "Clear date filter"}
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
                          {language === "vi" ? monthNamesVi[calMonth] : new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long" })}, {calYear}
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
                        {(Array.isArray(t("calendar.weekdays")) ? t("calendar.weekdays") : weekdaysVi).map(day => (
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
              )}


              {/* ── TAB SWITCHER: Chủ đề | Học kỳ ── (hidden in MY_SHARED mode) */}
              {communityFilterMode !== "MY_SHARED" && (
              <div className="flex justify-center mb-0">
                <div className="inline-flex p-1 bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 rounded-xl shadow-sm">
                  <button
                    onClick={() => {
                      setCommunityClassificationTab("ALL");
                      setSelectedCommunitySubjectCode(null);
                      setCommunityPage(1);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                      communityClassificationTab === "ALL"
                        ? "bg-purple-600/10 dark:bg-purple-500/25 text-purple-900 dark:text-purple-200 border border-purple-500/20 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Chủ đề
                  </button>
                  <button
                    onClick={() => {
                      setCommunityClassificationTab("SEMESTERS");
                      setSelectedCommunitySubjectCode(null);
                      setCommunityPage(1);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                      communityClassificationTab === "SEMESTERS"
                        ? "bg-purple-600/10 dark:bg-purple-500/25 text-purple-900 dark:text-purple-200 border border-purple-500/20 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Học kỳ
                  </button>
                </div>
              </div>
              )}

              {/* Loading */}
              {communityLoading ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase animate-pulse">
                    Đang tải danh mục cộng đồng...
                  </span>
                </div>
              ) : (
                <>
                  {/* Nếu đang tìm kiếm HOẶC đang chọn môn học cụ thể: Hiện lưới tài liệu */}
                  {(communitySearch || selectedCommunitySubjectCode || communityFilterMode === "MY_SHARED") ? (
                    <div className="w-full flex flex-col space-y-2">
                      {!communitySearch && selectedCommunitySubjectCode && (
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => { setSelectedCommunitySubjectCode(null); setCommunityPage(1); }}
                            className="self-start flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 rounded-xl px-4 py-2 shadow-sm cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            {communityClassificationTab === "SEMESTERS" ? "Quay lại học kỳ" : "Quay lại chủ đề"}
                          </button>
                          <div className="flex flex-col gap-1 p-4 bg-purple-50/20 dark:bg-purple-950/5 border border-purple-100/30 rounded-2xl">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/10">
                                MÔN HỌC
                              </span>
                              <h2 className="text-base font-black text-slate-900 dark:text-white">
                                {selectedCommunitySubjectCode}
                              </h2>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                              Hiển thị tài liệu được chia sẻ cho môn học này.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Khi đã chọn môn hoặc đang tìm kiếm: hiện lưới tài liệu */}
                      {filteredCommunityDocs.length > 0 ? (
                        <>
                          {pinnedCommunityDocs.length > 0 && (
                            <div className="space-y-3 bg-purple-50/20 dark:bg-purple-950/5 p-4 rounded-2xl border border-purple-100/30 text-left w-full">
                              <div className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                                <span>{language === "vi" ? "📌 Tài liệu ghim đầu trang" : "📌 Pinned Documents"}</span>
                                <span className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">{pinnedCommunityDocs.length}</span>
                              </div>
                              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                                {pinnedCommunityDocs.map((doc) => (
                                  <DocumentCard key={doc.document_id || doc.id} doc={doc} isPinned={doc.isPinned} onTogglePin={() => handleToggleCommunityPin(doc.id)} isPersonal={false} isMyShared={communityFilterMode === "MY_SHARED"} />
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-3 text-left w-full">
                            {pinnedCommunityDocs.length > 0 && regularCommunityDocs.length > 0 && (
                              <div className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest pl-1">
                                {language === "vi" ? "📂 Tài liệu cộng đồng khác" : "📂 Other community documents"}
                              </div>
                            )}
                            {regularCommunityDocs.length > 0 ? (
                              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                                {regularCommunityDocs.map((doc) => (
                                  <DocumentCard key={doc.document_id || doc.id} doc={doc} isPinned={doc.isPinned} onTogglePin={() => handleToggleCommunityPin(doc.id)} isPersonal={false} isMyShared={communityFilterMode === "MY_SHARED"} />
                                ))}
                              </div>
                            ) : (
                              pinnedCommunityDocs.length > 0 && (
                                <div className="text-center py-6 text-slate-400 text-xs font-medium bg-white/40 dark:bg-black/10 rounded-2xl border border-slate-100 dark:border-white/5">
                                  {language === "vi" ? "Không còn tài liệu nào khác trên trang này." : "No other documents on this page."}
                                </div>
                              )
                            )}
                          </div>
                          {filteredCommunityDocs.length > 9 && (
                            <div className="mt-2 flex justify-center">
                              <Pagination page={communityPage} totalPages={communityTotalPages} setPage={setCommunityPage} />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-20 bg-white/30 dark:bg-[#0f111a]/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 w-full">
                          <div className="text-5xl mb-4">📂</div>
                          <p className="text-sm font-bold text-slate-850 dark:text-slate-200 m-0">
                            {language === "vi" ? "Không tìm thấy tài liệu phù hợp" : "No matching documents found"}
                          </p>
                          <p className="text-xs text-slate-455 mt-2 m-0">
                            {language === "vi" ? "Vui lòng thử tìm kiếm bằng từ khóa khác." : "Try a different search term."}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Nếu KHÔNG chọn môn và KHÔNG tìm kiếm: Hiện danh mục phân loại theo Tab active */
                    <>
                      {/* ══════════════════════════════════════════ */}
                      {/* TAB: CHỦ ĐỀ                              */}
                      {/* ══════════════════════════════════════════ */}
                      {communityClassificationTab === "ALL" && (
                        <div className="w-full flex flex-col space-y-2">
                          {!rangeStart && (
                            communityTopicsLoading ? (
                              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                                <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
                                <span className="text-xs font-bold text-slate-400">Đang tải chủ đề...</span>
                              </div>
                            ) : communityTopics.length === 0 ? (
                              <div className="text-center py-16 bg-white/40 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                <Layers size={32} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-bold text-slate-500">Chưa có chủ đề nào</p>
                              </div>
                            ) : (
                              <div className="space-y-0 bg-white/60 dark:bg-[#0f111a]/60 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-sm">
                                {communityTopics.map((topic) => {
                                  const topicColor = topic.color || '#8b5cf6';
                                  const totalDocs = (topic.subjects || []).reduce((s, sub) => s + (Number(sub.doc_count) || 0), 0);
                                  return (
                                    <div key={topic.topic_id} className="flex items-center gap-5 px-5 py-4 hover:bg-white/80 dark:hover:bg-white/10 transition-colors group">
                                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform border" style={{ backgroundColor: `${topicColor}15`, borderColor: `${topicColor}30`, color: topicColor }}>
                                        <Folder size={24} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm" style={{ color: topicColor }}>
                                          {language === "en" && TOPIC_TRANSLATIONS[topic.name] ? TOPIC_TRANSLATIONS[topic.name].enName : topic.name}
                                        </p>
                                        {topic.description && (
                                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                            {language === "en" && TOPIC_TRANSLATIONS[topic.name] ? TOPIC_TRANSLATIONS[topic.name].enDesc : topic.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {(topic.subjects || []).map(s => (
                                            <button
                                              key={s.subject_code}
                                              onClick={() => {
                                                setSelectedCommunitySubjectCode(s.subject_code);
                                                setSelectedCommunityTopicId(topic.topic_id);
                                                setCommunityPage(1);
                                                if (mainContentRef.current) mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                              }}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-80 hover:shadow-sm active:scale-95 transition-all"
                                              style={{ backgroundColor: `${topicColor}15`, color: topicColor }}
                                            >
                                              <Folder size={10} /> {s.subject_code}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="shrink-0 flex gap-5 text-center">
                                        <div>
                                          <p className="text-base font-black" style={{ color: topicColor }}>{(topic.subjects || []).length}</p>
                                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Môn học</p>
                                        </div>
                                        <div>
                                          <p className="text-base font-black" style={{ color: topicColor }}>{totalDocs}</p>
                                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tài liệu</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* ══════════════════════════════════════════ */}
                      {/* TAB: HỌC KỲ                              */}
                      {/* ══════════════════════════════════════════ */}
                      {communityClassificationTab === "SEMESTERS" && (
                        <div className="flex flex-col gap-2">
                          {getSemestersData.length === 0 ? (
                            <div className="text-center py-16 bg-white/40 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                              <Calendar size={32} className="mx-auto text-slate-300 mb-3" />
                              <p className="text-sm font-bold text-slate-500">Chưa có học kỳ nào có tài liệu</p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {getSemestersData.map((sem) => (
                                <div
                                  key={sem.semester_id}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200/40 dark:border-white/5 bg-white/50 dark:bg-white/[0.03] hover:border-purple-400/30 transition-all duration-200"
                                >
                                  {/* Nhãn học kỳ */}
                                  <div className="flex items-center gap-2 shrink-0 w-[88px]">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sem.color }} />
                                    <span className="text-[11px] font-black whitespace-nowrap" style={{ color: sem.color }}>
                                      {sem.name}
                                    </span>
                                  </div>

                                  {/* Đường kẻ dọc */}
                                  <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />

                                  {/* Chips môn học - hàng ngang */}
                                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                    {sem.subjects.length > 0 ? sem.subjects.map((sub) => (
                                      <button
                                        key={sub.subject_code}
                                        onClick={() => {
                                          setSelectedCommunitySubjectCode(sub.subject_code);
                                          setCommunityPage(1);
                                        }}
                                        title={sub.subject_name || sub.subject_code}
                                        className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-md border transition-all duration-150 cursor-pointer shrink-0 ${
                                          sub.doc_count > 0
                                            ? "bg-purple-500/10 border-purple-500/20 text-purple-750 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40"
                                            : "bg-slate-100/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-150/50 dark:hover:bg-white/[0.04] hover:text-slate-600 dark:hover:text-slate-350"
                                        }`}
                                      >
                                        <span>{sub.subject_code}</span>
                                        {sub.doc_count > 0 && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                                        )}
                                      </button>
                                    )) : (
                                      <span className="text-[10px] text-slate-400 italic">Chưa có học phần</span>
                                    )}
                                  </div>

                                  {/* Badge số tài liệu */}
                                  {sem.totalDocs > 0 && (
                                    <span className="ml-auto shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                      {sem.totalDocs} tài liệu
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ── SCREEN 5: NOTIFICATIONS TIMELINE ── */}
        {activeTab === "Notifications" && (() => {
          // Filtered list
          const filteredNotifications = notificationsList.filter((notif) => {
            if (notifFilter === "UNREAD") return !notif.is_read;
            if (notifFilter === "REQUESTS") return notif.type === "ACCESS_REQUEST";
            return true; // "ALL"
          });

          // Custom time formatting helper
          const formatTimeAndDate = (dateString) => {
            if (!dateString) return "Chưa rõ";
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return "Chưa rõ";
            const pad = (n) => String(n).padStart(2, '0');
            return `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
          };

          return (
            <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up">
              {/* Header section with count stats & Actions */}
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
                <div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{t("notifications.section_label") || "Trung tâm thông báo"}</span>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1" style={{ color: "#000" }}>
                    {t("notifications.title") || "Thông báo học thuật & Yêu cầu quyền"}
                  </h1>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">
                    {t("notifications.subtitle") || "Theo dõi và phê duyệt các yêu cầu chia sẻ tài liệu, quyền truy cập cũng như các hoạt động học thuật cá nhân."}
                  </span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-650 bg-purple-50 hover:bg-purple-100 dark:text-purple-350 dark:bg-purple-950/20 dark:hover:bg-purple-950/45 border border-purple-500/10 cursor-pointer select-none transition-all duration-200 shadow-sm shrink-0 self-start md:self-end"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {t("notifications.mark_all_read") || "Đánh dấu tất cả đã đọc"}
                  </button>
                )}
              </header>

              {/* Filters Block */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 select-none scrollbar-none">
                <button
                  onClick={() => setNotifFilter("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${notifFilter === "ALL"
                    ? "bg-purple-600 text-white shadow-sm border border-transparent"
                    : "bg-white/50 dark:bg-[#0f111a]/50 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#0f111a]/70 border border-slate-100 dark:border-white/5"
                    }`}
                >
                  {t("community.filter_all") || "Tất cả"} ({notificationsList.length})
                </button>
                <button
                  onClick={() => setNotifFilter("UNREAD")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${notifFilter === "UNREAD"
                    ? "bg-purple-600 text-white shadow-sm border border-transparent"
                    : "bg-white/50 dark:bg-[#0f111a]/50 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#0f111a]/70 border border-slate-100 dark:border-white/5"
                    }`}
                >
                  {t("notifications.unread_badge") || "Chưa đọc"} ({unreadNotificationsCount})
                  {unreadNotificationsCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => setNotifFilter("REQUESTS")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${notifFilter === "REQUESTS"
                    ? "bg-purple-600 text-white shadow-sm border border-transparent"
                    : "bg-white/50 dark:bg-[#0f111a]/50 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#0f111a]/70 border border-slate-100 dark:border-white/5"
                    }`}
                >
                  {language === "vi" ? `Yêu cầu quyền (${notificationsList.filter((n) => n.type === "ACCESS_REQUEST").length})` : `Access Requests (${notificationsList.filter((n) => n.type === "ACCESS_REQUEST").length})`}
                </button>
              </div>

              {/* Timeline Items List */}
              <div className="flex flex-col gap-4">
                {notificationsLoading ? (
                  <div className="liquid-glass rounded-xl p-10 text-center text-xs font-bold text-slate-500 shadow-sm">
                    {language === "vi" ? "Đang tải thông báo..." : "Loading notifications..."}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="liquid-glass rounded-xl p-10 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                    {notifFilter === "UNREAD"
                      ? (language === "vi" ? "Bạn đã đọc hết tất cả thông báo!" : "You've read all notifications!")
                      : notifFilter === "REQUESTS"
                        ? (language === "vi" ? "Không có yêu cầu quyền truy cập tài liệu nào." : "No document access requests.")
                        : (t("notifications.empty_desc") || "Danh sách thông báo trống.")}
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    let Icon = Info;
                    let iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-950/20";
                    let iconBorder = "border-blue-200 dark:border-blue-900/30";

                    if (notif.type === "ACCESS_APPROVED" || notif.type === "SHARE_INVITE") {
                      Icon = CheckCircle;
                      iconColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
                      iconBorder = "border-emerald-200 dark:border-emerald-900/30";
                    } else if (notif.type === "ACCESS_REQUEST") {
                      Icon = AlertTriangle;
                      iconColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20";
                      iconBorder = "border-amber-200 dark:border-amber-900/30";
                    } else if (notif.type === "ACCESS_DENIED") {
                      Icon = X;
                      iconColor = "text-red-500 bg-red-50 dark:bg-red-950/20";
                      iconBorder = "border-red-200 dark:border-red-900/30";
                    }

                    // Render avatar details or initials
                    const senderName = notif.sender_first_name
                      ? `${notif.sender_last_name} ${notif.sender_first_name}`.trim()
                      : "Người dùng hệ thống";
                    const senderInitials = senderName.split(" ").slice(-2).map(n => n[0]).join("").toUpperCase();

                    return (
                      <div
                        key={notif.notification_id}
                        onClick={() => {
                          if (!notif.is_read) {
                            handleMarkAsRead(notif.notification_id);
                          }
                        }}
                        className={`liquid-glass rounded-2xl p-5 border shadow-sm transition-all duration-300 flex items-start gap-4 select-none ${!notif.is_read
                          ? "bg-purple-650/5 hover:bg-purple-650/10 border-purple-500/15"
                          : "bg-white/40 dark:bg-[#0f111a]/40 hover:bg-white/60 dark:hover:bg-[#0f111a]/60 border-slate-100 dark:border-white/5"
                          }`}
                      >
                        {/* Custom Avatar with Floating Action Badge */}
                        <div className="relative shrink-0 select-none">
                          {notif.sender_avatar ? (
                            <img
                              src={notif.sender_avatar}
                              alt={senderName}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-200/40 dark:border-purple-800/40 flex items-center justify-center text-xs font-black text-purple-700 dark:text-purple-300">
                              {senderInitials || "SV"}
                            </div>
                          )}
                          {/* Left Icon Badge overlayed on bottom right */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border ${iconColor} ${iconBorder} shadow-sm`}>
                            <Icon className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Right Content details */}
                        <div className="flex-1 flex flex-col gap-1.5 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <span className={`text-xs md:text-sm font-semibold leading-tight text-slate-850 dark:text-slate-150`}>
                              {notif.message}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap mt-0.5 select-none">
                              {formatTimeAndDate(notif.created_at)}
                            </span>
                          </div>

                          {/* document access and permission button action row */}
                          <div className="flex flex-wrap items-center gap-3.5 mt-0.5">
                            {notif.document_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!notif.is_read) {
                                    handleMarkAsRead(notif.notification_id);
                                  }
                                  navigate(`/preview/${notif.document_id}`);
                                }}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-650 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
                              >
                                {language === "vi" ? "Xem tài liệu" : "View document"} <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {notif.type === "ACCESS_REQUEST" && (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {notif.action_status === "PENDING" ? (
                                  <>
                                    <button
                                      onClick={() => handleApproveAccess(notif.notification_id)}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer shadow-sm select-none"
                                    >
                                      {language === "vi" ? "Cho phép" : "Approve"}
                                    </button>
                                    <button
                                      onClick={() => handleDenyAccess(notif.notification_id)}
                                      className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-black rounded-lg transition-colors cursor-pointer select-none"
                                    >
                                      {language === "vi" ? "Từ chối" : "Deny"}
                                    </button>
                                  </>
                                ) : notif.action_status === "APPROVED" ? (
                                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded uppercase tracking-wider select-none border border-emerald-500/10">
                                    {language === "vi" ? "Đã phê duyệt" : "Approved"}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded uppercase tracking-wider select-none border border-red-500/10">
                                    {language === "vi" ? "Đã từ chối" : "Denied"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Unread indicator / close buttons */}
                        <div className="flex flex-col items-end gap-2 shrink-0 select-none">
                          {!notif.is_read ? (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 self-center" title="Chưa đọc" />
                          ) : (
                            <span className="w-2 h-2 shrink-0 opacity-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* ── SCREEN 6: PROFILE & SETTINGS ── */}
        {activeTab === "Personal Profile" && (
          <div className="flex flex-col gap-6 max-w-5xl w-full mx-auto animate-spring-up text-left">
            <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800/60 pb-5 select-none text-left">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{t("profile.section_label") || "Định danh tài khoản"}</span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1" style={{ color: "#000" }}>
                {t("profile.title") || "Hồ sơ sinh viên"}
              </h1>
              <span className="text-xs text-slate-500 font-medium mt-1">
                {t("profile.subtitle") || "Thông tin xác thực thông qua hệ thống học đường và Google Cloud."}
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
                      <div className="w-full h-full rounded-full bg-purple-600 flex flex-col items-center justify-center font-bold text-white text-4xl shadow-md overflow-hidden transition-all duration-300 border-[6px] border-white dark:border-[#0f111a] group relative">
                        {avatarPreview || user?.avatar_url ? (
                          <img src={avatarPreview || user?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="group-hover:opacity-0 transition-opacity duration-300">{fullName.charAt(0)}</span>
                        )}

                        <label className="absolute inset-0 bg-purple-950/70 text-white flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-10 rounded-full">
                          <Camera className="w-5 h-5 text-white/90" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-white/90 select-none">Đổi ảnh</span>
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
                        <span className="text-2xl md:text-3xl font-black leading-none tracking-tight" style={{ color: "#000" }}>{fullName}</span>
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
                <h3 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-2.5" style={{ color: "#000" }}>
                  <UserIcon className="w-4 h-4 text-purple-500" /> {language === "vi" ? "Thông tin cá nhân & Học tập" : "Personal & Academic Info"}
                </h3>
                {!isEditingProfile ? (
                  <button onClick={handleEditProfileToggle} className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-900/30 px-3.5 py-1.5 rounded-lg">
                    {t("profile.save_btn") ? (language === "vi" ? "Chỉnh sửa" : "Edit") : "Chỉnh sửa"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleEditProfileToggle} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      {language === "vi" ? "Hủy" : "Cancel"}
                    </button>
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors px-4 py-1.5 rounded-lg shadow-sm">
                      {isSavingProfile ? (t("profile.saving") || "Đang lưu...") : (t("profile.save_btn") || "Lưu thay đổi")}
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
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{t("profile.phone_label") || "Số điện thoại"}</span>
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
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{language === "vi" ? "Ngày sinh" : "Date of Birth"}</span>
                    {isEditingProfile ? (() => {
                      let dobDay = "";
                      let dobMonth = "";
                      let dobYear = "";
                      if (editProfileData.dob) {
                        const parts = editProfileData.dob.split("-");
                        if (parts.length === 3) {
                          dobYear = parts[0];
                          dobMonth = parts[1];
                          dobDay = parts[2];
                        }
                      }
                      const daysInMonth = getDaysInMonth(parseInt(dobMonth || "1", 10), parseInt(dobYear || "2000", 10));
                      return (
                        <div className="flex gap-2 mt-1 w-full max-w-[360px]">
                          <select
                            value={dobDay}
                            onChange={(e) => handleDobPartChange("day", e.target.value)}
                            className="h-8 flex-1 text-sm font-semibold bg-white dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 px-2 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 cursor-pointer"
                          >
                            <option value="">{language === "vi" ? "Ngày" : "Day"}</option>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const d = String(i + 1).padStart(2, "0");
                              return <option key={d} value={d}>{d}</option>;
                            })}
                          </select>
                          <select
                            value={dobMonth}
                            onChange={(e) => handleDobPartChange("month", e.target.value)}
                            className="h-8 flex-1 text-sm font-semibold bg-white dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 px-2 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 cursor-pointer"
                          >
                            <option value="">{language === "vi" ? "Tháng" : "Month"}</option>
                            {Array.from({ length: 12 }, (_, i) => {
                              const m = String(i + 1).padStart(2, "0");
                              return <option key={m} value={m}>{m}</option>;
                            })}
                          </select>
                          <select
                            value={dobYear}
                            onChange={(e) => handleDobPartChange("year", e.target.value)}
                            className="h-8 flex-1 text-sm font-semibold bg-white dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 px-2 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 cursor-pointer"
                          >
                            <option value="">{language === "vi" ? "Năm" : "Year"}</option>
                            {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => {
                              const y = String(new Date().getFullYear() - i);
                              return <option key={y} value={y}>{y}</option>;
                            })}
                          </select>
                        </div>
                      );
                    })() : (
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
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{language === "vi" ? "Giới tính" : "Gender"}</span>
                    {isEditingProfile ? (
                      <select value={editProfileData.gender} onChange={(e) => setEditProfileData({ ...editProfileData, gender: e.target.value })} className="h-8 text-sm font-semibold bg-white dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 px-3 outline-none mt-1 focus-visible:ring-1 focus-visible:ring-purple-500">
                        <option value="">{language === "vi" ? "Chọn giới tính" : "Select gender"}</option>
                        <option value="Nam">{language === "vi" ? "Nam" : "Male"}</option>
                        <option value="Nữ">{language === "vi" ? "Nữ" : "Female"}</option>
                        <option value="Khác">{language === "vi" ? "Khác" : "Other"}</option>
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
                    <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">{language === "vi" ? "Ngành học" : "Major / Faculty"}</span>
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
              <h3 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/60 pb-4" style={{ color: "#000" }}>
                <Cloud className="w-4 h-4 text-blue-500" /> {language === "vi" ? "Dung lượng lưu trữ" : "Storage Usage"}
              </h3>

              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-10">
                <div className="flex flex-col gap-2 flex-1 w-full">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl md:text-5xl font-black leading-none tracking-tight" style={{ color: "#000" }}>{usageInGB}<span className="text-xl md:text-2xl text-slate-500 ml-1 font-bold">GB</span></span>
                    <span className="text-sm font-bold text-slate-400 mb-1">/ {limitInGB} GB {language === "vi" ? "đã sử dụng" : "used"}</span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-4 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700/50">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-1.5">{percentage.toFixed(1)}% {language === "vi" ? "Không gian đám mây" : "Cloud Storage"}</span>
                </div>

                <Button
                  onClick={() => setActiveTab("Document Management")}
                  className="bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 dark:text-black text-white font-extrabold text-xs rounded-xl px-7 py-6 whitespace-nowrap shadow-sm shrink-0 transition-transform active:scale-95"
                >
                  {language === "vi" ? "Quản lý tài liệu" : "Document Management"}
                </Button>
              </div>
            </Card>

            {/* 4. Password Form Card */}
            <Card className="liquid-glass rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm border-0">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <h3 className="text-sm font-extrabold tracking-wider uppercase flex items-center gap-2.5" style={{ color: "#000" }}>
                  <Lock className="w-4 h-4 text-purple-500" /> {isResettingPasswordWithOtp ? (language === "vi" ? "Đặt lại mật khẩu qua OTP" : "Reset Password via OTP") : (t("profile.change_password") || "Đổi mật khẩu học tập")}
                </h3>
                {isResettingPasswordWithOtp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPasswordWithOtp(false);
                      setChangePasswordError("");
                      setChangePasswordSuccess("");
                      setResetOtpCode("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg"
                  >
                    {language === "vi" ? "Đổi thông thường" : "Normal change"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={resetEmailLoading}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                  >
                    {resetEmailLoading ? (language === "vi" ? "Đang gửi email..." : "Sending email...") : (t("auth.forgot_password") || "Quên mật khẩu?")}
                  </button>
                )}
              </div>

              <form onSubmit={isResettingPasswordWithOtp ? handleResetPasswordWithOtp : handleChangePassword} className="flex flex-col gap-6">
                {changePasswordError && (
                  <div className="flex items-start gap-2.5 text-xs text-red-650 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl p-3.5 backdrop-blur-md">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-555" />
                    <span className="font-bold">{changePasswordError}</span>
                  </div>
                )}

                {changePasswordSuccess && (
                  <div className="flex items-start gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-900/30 rounded-xl p-3.5 backdrop-blur-md">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                    <span className="font-bold">{changePasswordSuccess}</span>
                  </div>
                )}

                {isResettingPasswordWithOtp ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{language === "vi" ? "Mã xác thực OTP" : "OTP Verification Code"}</label>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="Nhập mã OTP 6 số"
                        value={resetOtpCode}
                        onChange={(e) => setResetOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                        disabled={changePasswordLoading}
                        className="bg-white/60 dark:bg-[#0c0d13]/60 border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-5 text-sm font-semibold text-center tracking-widest focus-visible:ring-1 focus-visible:ring-purple-500 font-mono"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t("profile.new_password") || "Mật khẩu mới"}</label>
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
                        className="bg-white/60 dark:bg-[#0c0d13]/60 border-slate-200/60 dark:border-slate-850 rounded-xl px-4 py-5 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-purple-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t("profile.old_password") || "Mật khẩu hiện tại"}</label>
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
                )}

                <div className="flex justify-start mt-2">
                  <Button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wider px-8 py-5 rounded-xl shadow-sm transition-transform active:scale-95"
                  >
                    {changePasswordLoading
                      ? (language === "vi" ? "Đang xử lý..." : "Processing...")
                      : isResettingPasswordWithOtp
                        ? (language === "vi" ? "Đặt lại mật khẩu" : "Reset Password")
                        : (t("profile.update_password") || "Cập nhật mật khẩu")}
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
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "#000" }}>{language === "vi" ? "Xác nhận xóa học liệu" : "Confirm Delete Learning Material"}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{language === "vi" ? "Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này khỏi hệ thống lưu trữ đám mây của AIStudyHub không?" : "Are you sure you want to permanently delete this document from the AIStudyHub cloud storage system?"}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDocId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                {language === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteDocumentConfirmed(deleteConfirmDocId);
                  setDeleteConfirmDocId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200/60 dark:border-red-900/30 hover:bg-red-600 dark:hover:bg-red-600 hover:text-white dark:hover:text-white hover:border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300"
              >
                {language === "vi" ? "Xác nhận xóa" : "Confirm Delete"}
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
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "#000" }}>Xác nhận trùng lặp</h3>
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
                {language === "vi" ? "Hủy bỏ" : "Cancel"}
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
                  handleRealUpload(null, true, {
                    fileToUpload: finalFile,
                    finalTitle,
                    subject: duplicateConfirmData.quickUploadSubject,
                    tags: duplicateConfirmData.quickUploadTags
                  });
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-yellow-650 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-900/30 hover:bg-yellow-500 hover:text-white dark:hover:text-white hover:border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300"
              >
                {language === "vi" ? "Tiếp tục tải lên" : "Continue Upload"}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Share Document Modal */}
      {shareModalDoc && (
        <ShareDocumentModal
          documentId={shareModalDoc.document_id || shareModalDoc.id}
          onClose={() => setShareModalDoc(null)}
        />
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          currentUserId={user?.user_id}
          onShare={() => {
            setShareModalDoc(previewDoc);
            setPreviewDoc(null);
          }}
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
                  <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "#000" }}>Chỉnh sửa tài liệu</h3>
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
            <div className="flex flex-col gap-1.5">
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
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const val = editTagInput.trim().toUpperCase();
                      if (val && !editTags.includes(val) && editTags.length < 5) {
                        setEditTags([...editTags, val]);
                        setEditTagInput("");
                      } else if (editTags.length >= 5) {
                        toast.error("Tối đa 5 thẻ tag!");
                      }
                    }
                  }}
                  placeholder={editTags.length < 5 ? "Nhập tag và nhấn Enter..." : ""}
                  className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 min-w-[120px]"
                  disabled={editTags.length >= 5}
                />
              </div>
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
                    const res = await fetch(`${API_URL}/api/documents/${targetId}/edit`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: editTitle.trim(),
                        subject: editSubject || editSubjectSearch || "OTHER",
                        tags: editTags,
                        description: editModalDoc.description || null,
                      })
                    });
                    if (!res.ok) throw new Error("Failed");
                    toast.success(language === "vi" ? "Đã chia sẻ tài liệu lên cộng đồng thành công!" : "Document shared to community successfully!");
                    setShareModalDoc(null);
                    fetchDashboard();
                  } catch (err) {
                    toast.error(`Lỗi: ${err.message}`);
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
                disabled={isSavingEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white border border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300 disabled:opacity-70"
              >
                {isSavingEdit ? (language === "vi" ? "Đang lưu..." : "Saving...") : (
                  <><Save className="w-4 h-4" /> {t("profile.save_btn") || "Lưu thay đổi"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
