import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  ListChecks,
  Keyboard,
  Upload,
  Sparkles,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trash2,
  Lightbulb,
  ArrowLeftRight,
  Loader2,
  Shuffle,
  Award,
  FileText
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function normalizeAnswer(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:'"()]/g, "");
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hasLessonContent(lesson) {
  const c = lesson?.content;
  if (!c) return false;
  return (
    (Array.isArray(c.flashcards) && c.flashcards.length > 0) ||
    (Array.isArray(c.mcQuestions) && c.mcQuestions.length > 0) ||
    (Array.isArray(c.fillQuestions) && c.fillQuestions.length > 0)
  );
}

export default function PracticeHub({ user, resetKey = 0 }) {
  const storageKey = `aistudyhub_practice_folders_${user?.user_id || "guest"}`;

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeLessonRef, setActiveLessonRef] = useState(null); // { folderId, sectionId, lessonId }

  // Upload & Analyze state
  const [uploadedFile, setUploadedFile] = useState(null); // { name, type, content, documentId }
  const [isUploading, setIsUploading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [itemCountPerLesson, setItemCountPerLesson] = useState("auto");
  const [showCountDropdown, setShowCountDropdown] = useState(false);
  const countDropdownRef = useRef(null);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(null); // { folderId, done, total, currentTitle }

  const countOptions = [
    { value: "auto", label: "AI tự chia theo nội dung" },
    { value: 8, label: "8 câu / thẻ" },
    { value: 10, label: "10 câu / thẻ" },
    { value: 15, label: "15 câu / thẻ" },
    { value: 20, label: "20 câu / thẻ" },
    { value: 30, label: "30 câu / thẻ" }
  ];

  useEffect(() => {
    if (resetKey > 0) {
      setActiveLessonRef(null);
      setSelectedFolderId(null);
    }
  }, [resetKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countDropdownRef.current && !countDropdownRef.current.contains(event.target)) {
        setShowCountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lesson Practice state
  const [practiceTab, setPracticeTab] = useState("flashcard"); // "flashcard" | "mc" | "fill"

  // Flashcard state
  const [fcCards, setFcCards] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcMastered, setFcMastered] = useState({}); // { cardId: true }

  // MC Quiz state
  const [mcList, setMcList] = useState([]);
  const [mcAnswers, setMcAnswers] = useState({});

  // Fill-in-the-blank Vocab Quiz state
  const [fillMode, setFillMode] = useState("en-vi"); // "en-vi" | "vi-en"
  const [fillList, setFillList] = useState([]);
  const [fillInputs, setFillInputs] = useState({});
  const [fillResults, setFillResults] = useState({}); // { idx: { checked: bool, isCorrect: bool } }
  const [fillHints, setFillHints] = useState({});

  // Load saved folders from localStorage first, then merge/sync with Supabase DB
  useEffect(() => {
    let localFolders = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localFolders = parsed;
          setFolders(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load practice folders from localStorage:", e);
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      axios
        .get(`${API_URL}/api/chat/practice/folders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
          if (Array.isArray(res.data)) {
            const dbFolders = res.data;
            const dbMap = new Map(dbFolders.map(f => [f.id, f]));

            // Push any local-only folders up to Supabase DB
            const localOnly = localFolders.filter(lf => !dbMap.has(lf.id));
            localOnly.forEach(lf => syncFolderToDB(lf));

            const merged = [...dbFolders, ...localOnly];
            setFolders(merged);
            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch (err) {
              console.warn("LocalStorage cache warning:", err);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load practice folders from Supabase DB:", err);
        });
    }
  }, [storageKey]);

  const syncFolderToDB = async (folderObj) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token || !folderObj) return;
    try {
      await axios.post(`${API_URL}/api/chat/practice/folders/save`, folderObj, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to sync practice folder to Supabase DB:", err);
    }
  };

  const persistFolders = (nextFolders, changedFolder = null) => {
    setFolders(nextFolders);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextFolders));
    } catch (e) {
      console.warn("LocalStorage quota exceeded when saving practice folders:", e);
    }
    if (changedFolder) {
      syncFolderToDB(changedFolder);
    }
  };

  const selectedFolder = useMemo(
    () => folders.find(f => f.id === selectedFolderId) || null,
    [folders, selectedFolderId]
  );

  const activeLessonContext = useMemo(() => {
    if (!activeLessonRef) return null;
    const folder = folders.find(f => f.id === activeLessonRef.folderId);
    if (!folder) return null;
    const section = folder.sections.find(s => s.id === activeLessonRef.sectionId);
    if (!section) return null;
    const lesson = section.lessons.find(l => l.id === activeLessonRef.lessonId);
    if (!lesson) return null;
    return { folder, section, lesson };
  }, [folders, activeLessonRef]);

  // Sync local practice states when activeLessonContext changes
  const loadLessonIntoPracticeState = (lesson) => {
    const content = lesson?.content;
    if (!content) return;
    setFcCards(content.flashcards || []);
    setFcIndex(0);
    setFcFlipped(false);
    setFcMastered({});

    setMcList(content.mcQuestions || []);
    setMcAnswers({});

    setFillList(content.fillQuestions || []);
    setFillInputs({});
    setFillResults({});
    setFillHints({});
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_URL}/api/chat/upload-temp`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      setUploadedFile({
        name: res.data.fileName,
        type: res.data.fileType,
        content: res.data.extractedText,
        documentId: res.data.documentId
      });
      toast.success(`Đã tải lên tài liệu: ${res.data.fileName}`);
    } catch (err) {
      console.error("Practice file upload error:", err);
      toast.error(err.response?.data?.error || "Không thể đọc tài liệu này.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeAndCreateFolder = async () => {
    if (!uploadedFile && !customPrompt.trim()) {
      toast.error("Vui lòng tải lên tài liệu hoặc nhập chủ đề muốn luyện tập.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/chat/practice/analyze`,
        {
          fileName: uploadedFile?.name || "",
          documentContext: uploadedFile?.content || "",
          documentId: uploadedFile?.documentId || null,
          customPrompt: customPrompt.trim()
        },
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      const data = res.data;
      const newFolder = {
        id: `folder-${Date.now()}`,
        folderTitle: data.folderTitle,
        description: data.description,
        isVocabularyDoc: Boolean(data.isVocabularyDoc),
        createdAt: new Date().toISOString(),
        documentId: uploadedFile?.documentId || null,
        // Keep up to 500KB of text so all sections remain available when generating lessons
        documentContext: uploadedFile?.content ? uploadedFile.content.slice(0, 500000) : "",
        sections: data.sections || []
      };

      const nextFolders = [newFolder, ...folders];
      persistFolders(nextFolders, newFolder);
      setSelectedFolderId(newFolder.id);

      // Auto-expand all sections of the new folder
      const exp = {};
      (newFolder.sections || []).forEach(s => { exp[s.id] = true; });
      setExpandedSections(exp);

      setUploadedFile(null);
      setCustomPrompt("");
      setIsAnalyzing(false);

      // Automatically pre-generate ALL lessons in the folder (in parallel batches of 3)
      const allTasks = [];
      (newFolder.sections || []).forEach(sec => {
        (sec.lessons || []).forEach(les => {
          allTasks.push({ section: sec, lesson: les });
        });
      });

      if (allTasks.length > 0) {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        let workingFolder = newFolder;
        let doneCount = 0;
        setPreloadProgress({
          folderId: newFolder.id,
          done: 0,
          total: allTasks.length,
          currentTitle: allTasks[0].lesson.title
        });

        const CONCURRENCY = 3;
        for (let i = 0; i < allTasks.length; i += CONCURRENCY) {
          const batch = allTasks.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.allSettled(
            batch.map(async ({ section, lesson }) => {
              const lessonRes = await axios.post(
                `${API_URL}/api/chat/practice/generate-lesson`,
                {
                  folderId: workingFolder.id,
                  sectionId: section.id,
                  lessonId: lesson.id,
                  folderTitle: workingFolder.folderTitle,
                  sectionTitle: section.title,
                  lessonTitle: lesson.title,
                  lessonFocus: lesson.focus,
                  isVocabularyDoc: workingFolder.isVocabularyDoc,
                  documentContext: workingFolder.documentContext || "",
                  documentId: workingFolder.documentId || null,
                  itemCount: itemCountPerLesson
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { sectionId: section.id, lessonId: lesson.id, lessonTitle: lesson.title, content: lessonRes.data };
            })
          );

          const contentMap = new Map();
          batchResults.forEach((r) => {
            doneCount += 1;
            if (r.status === "fulfilled") {
              contentMap.set(`${r.value.sectionId}::${r.value.lessonId}`, r.value.content);
            }
          });

          workingFolder = {
            ...workingFolder,
            sections: workingFolder.sections.map(s => ({
              ...s,
              lessons: s.lessons.map(l => {
                const c = contentMap.get(`${s.id}::${l.id}`);
                return c ? { ...l, content: c, attempts: l.attempts || 0 } : l;
              })
            }))
          };

          setFolders(prev => {
            const updated = prev.map(f => (f.id === workingFolder.id ? workingFolder : f));
            try {
              localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });

          const nextTask = allTasks[Math.min(i + CONCURRENCY, allTasks.length - 1)];
          setPreloadProgress({
            folderId: newFolder.id,
            done: doneCount,
            total: allTasks.length,
            currentTitle: nextTask?.lesson?.title || ""
          });
        }

        syncFolderToDB(workingFolder);
        setPreloadProgress(null);
        toast.success(`Đã tạo sẵn toàn bộ ${allTasks.length} bài tập trong "${newFolder.folderTitle}"!`);
      } else {
        toast.success(`Đã tạo Folder "${newFolder.folderTitle}"!`);
      }
    } catch (err) {
      console.error("Analyze practice folder error:", err);
      toast.error(err.response?.data?.error || "Lỗi khi phân tích tài liệu.");
      setPreloadProgress(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenLesson = async (folder, section, lesson, forceRegenerate = false) => {
    setActiveLessonRef({ folderId: folder.id, sectionId: section.id, lessonId: lesson.id });

    if (hasLessonContent(lesson) && !forceRegenerate) {
      setIsGeneratingLesson(false);
      loadLessonIntoPracticeState(lesson);
      return;
    }

    setIsGeneratingLesson(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/chat/practice/generate-lesson`,
        {
          folderId: folder.id,
          sectionId: section.id,
          lessonId: lesson.id,
          folderTitle: folder.folderTitle,
          sectionTitle: section.title,
          lessonTitle: lesson.title,
          lessonFocus: lesson.focus,
          isVocabularyDoc: folder.isVocabularyDoc,
          documentContext: folder.documentContext || "",
          documentId: folder.documentId || null,
          itemCount: itemCountPerLesson
        },
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      const generatedContent = res.data;
      const updatedFolders = folders.map(f => {
        if (f.id !== folder.id) return f;
        return {
          ...f,
          sections: f.sections.map(s => {
            if (s.id !== section.id) return s;
            return {
              ...s,
              lessons: s.lessons.map(l => {
                if (l.id !== lesson.id) return l;
                return {
                  ...l,
                  content: generatedContent,
                  attempts: l.attempts || 0
                };
              })
            };
          })
        };
      });

      const changedFolder = updatedFolders.find(f => f.id === folder.id) || null;
      persistFolders(updatedFolders, changedFolder);
      loadLessonIntoPracticeState({ ...lesson, content: generatedContent });
      toast.success("Đã tạo xong bộ bài tập luyện tập!");
    } catch (err) {
      console.error("Generate lesson error:", err);
      toast.error(err.response?.data?.error || "Không thể tạo bài tập cho mục này.");
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const recordPracticeAttempt = (scoreText) => {
    if (!activeLessonRef) return;
    const updatedFolders = folders.map(f => {
      if (f.id !== activeLessonRef.folderId) return f;
      return {
        ...f,
        sections: f.sections.map(s => {
          if (s.id !== activeLessonRef.sectionId) return s;
          return {
            ...s,
            lessons: s.lessons.map(l => {
              if (l.id !== activeLessonRef.lessonId) return l;
              return {
                ...l,
                attempts: (l.attempts || 0) + 1,
                lastScore: scoreText,
                lastPracticedAt: new Date().toISOString()
              };
            })
          };
        })
      };
    });
    const changedFolder = updatedFolders.find(f => f.id === activeLessonRef.folderId) || null;
    persistFolders(updatedFolders, changedFolder);
  };

  const handleDeleteFolder = (folderId, e) => {
    e.stopPropagation();
    const next = folders.filter(f => f.id !== folderId);
    persistFolders(next);
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      axios
        .delete(`${API_URL}/api/chat/practice/folders/${folderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .catch((err) => console.error("Failed to delete practice folder from DB:", err));
    }
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    if (activeLessonRef?.folderId === folderId) setActiveLessonRef(null);
    toast.success("Đã xóa folder luyện tập.");
  };

  // --- MC Quiz helpers ---
  const getOptionLetter = (opt, optIdx) => {
    const match = String(opt).trim().match(/^([A-Da-d])[.):\s]/);
    if (match) return match[1].toUpperCase();
    return ["A", "B", "C", "D"][optIdx] || String(optIdx + 1);
  };

  const handleSelectMc = (qIdx, letter) => {
    if (mcAnswers[qIdx]) return;
    const next = { ...mcAnswers, [qIdx]: letter };
    setMcAnswers(next);
    if (Object.keys(next).length === mcList.length && mcList.length > 0) {
      const correct = mcList.reduce((acc, q, i) => (next[i] === q.correctAnswer ? acc + 1 : acc), 0);
      recordPracticeAttempt(`MC: ${correct}/${mcList.length}`);
    }
  };

  const handleResetMc = (shuffle = false) => {
    setMcAnswers({});
    if (shuffle) {
      setMcList(prev => shuffleArray(prev));
    }
  };

  // --- Fill-in-the-blank helpers ---
  const handleCheckFill = (idx) => {
    const q = fillList[idx];
    if (!q) return;
    const userVal = normalizeAnswer(fillInputs[idx] || "");
    if (!userVal) {
      toast.error("Vui lòng nhập đáp án trước khi kiểm tra.");
      return;
    }

    const acceptedList = fillMode === "en-vi"
      ? (q.acceptedVietnamese?.length ? q.acceptedVietnamese : [q.vietnameseMeaning])
      : (q.acceptedEnglish?.length ? q.acceptedEnglish : [q.englishTerm]);

    const isCorrect = acceptedList.some(ans => normalizeAnswer(ans) === userVal);
    const nextResults = { ...fillResults, [idx]: { checked: true, isCorrect } };
    setFillResults(nextResults);

    if (Object.keys(nextResults).length === fillList.length && fillList.length > 0) {
      const correct = Object.values(nextResults).filter(r => r.isCorrect).length;
      const modeLabel = fillMode === "en-vi" ? "Anh-Việt" : fillMode === "vi-en" ? "Việt-Anh" : "Phiên âm-Viết";
      recordPracticeAttempt(`Điền từ (${modeLabel}): ${correct}/${fillList.length}`);
    }
  };

  const handleResetFill = (shuffle = false) => {
    setFillInputs({});
    setFillResults({});
    setFillHints({});
    if (shuffle) {
      setFillList(prev => shuffleArray(prev));
    }
  };

  const handleSwitchFillMode = (mode) => {
    setFillMode(mode);
    setFillInputs({});
    setFillResults({});
    setFillHints({});
  };

  // ============================================================================
  // RENDER: LESSON PRACTICE VIEW
  // ============================================================================
  if (activeLessonContext) {
    const { folder, section, lesson } = activeLessonContext;
    const currentCard = fcCards[fcIndex];
    const allLessonCards = lesson.content?.flashcards || fcCards;
    const masteredCount = allLessonCards.filter(c => fcMastered[c.id] === true).length;
    const unmasteredCards = allLessonCards.filter(c => fcMastered[c.id] === false);
    const remainingUnmasteredCount = allLessonCards.filter(c => fcMastered[c.id] !== true).length;
    const mcAnsweredCount = Object.keys(mcAnswers).length;
    const mcCorrectCount = mcList.reduce((acc, q, i) => (mcAnswers[i] === q.correctAnswer ? acc + 1 : acc), 0);
    const fillCheckedCount = Object.keys(fillResults).length;
    const fillCorrectCount = Object.values(fillResults).filter(r => r.isCorrect).length;

    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveLessonRef(null)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Quay lại Folder"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                <span>{folder.folderTitle}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{section.title}</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold !text-slate-900 dark:!text-white mt-0.5">
                {lesson.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lesson.attempts > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/70 dark:border-emerald-800/50">
                <Award className="w-3.5 h-3.5" />
                Đã ôn {lesson.attempts} lần
              </span>
            )}
            <button
              type="button"
              disabled={isGeneratingLesson}
              onClick={() => handleOpenLesson(folder, section, lesson, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tạo bộ câu hỏi mới
            </button>
          </div>
        </div>

        {isGeneratingLesson ? (
          <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              AI đang tạo Flashcard, Quiz Trắc nghiệm & Quiz Điền từ cho bài học này...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bộ bài tập sẽ được lưu lại để bạn có thể ôn tập đi ôn tập lại nhiều lần.
            </p>
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div className="flex flex-wrap gap-2 bg-white dark:bg-[#11131e] p-1.5 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm w-fit">
              <button
                type="button"
                onClick={() => setPracticeTab("flashcard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  practiceTab === "flashcard"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Layers className="w-4 h-4" />
                Flashcard ({fcCards.length})
              </button>
              <button
                type="button"
                onClick={() => setPracticeTab("mc")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  practiceTab === "mc"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ListChecks className="w-4 h-4" />
                Quiz Trắc nghiệm ({mcList.length})
              </button>
              <button
                type="button"
                onClick={() => setPracticeTab("fill")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  practiceTab === "fill"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Keyboard className="w-4 h-4" />
                Quiz Điền từ ({fillList.length})
              </button>
            </div>

            {/* TAB 1: FLASHCARD */}
            {practiceTab === "flashcard" && (
              <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
                {fcCards.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Chưa có thẻ Flashcard cho bài này.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="text-slate-600 dark:text-slate-300">
                          Thẻ {fcIndex + 1}/{fcCards.length}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                          Đã nhớ: {masteredCount}/{allLessonCards.length}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                          Chưa nhớ: {unmasteredCards.length} (Còn lại: {remainingUnmasteredCount})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const toReview = allLessonCards.filter(c => fcMastered[c.id] !== true);
                            if (toReview.length === 0) {
                              toast.success("Bạn đã nhớ hết tất cả thẻ!");
                              return;
                            }
                            setFcCards(toReview);
                            setFcIndex(0);
                            setFcFlipped(false);
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                        >
                          Chỉ ôn thẻ chưa nhớ ({remainingUnmasteredCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFcCards(shuffleArray(lesson.content?.flashcards || []));
                            setFcIndex(0);
                            setFcFlipped(false);
                            setFcMastered({});
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          Xáo trộn & Học lại
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setFcFlipped(f => !f)}
                      className="w-full cursor-pointer select-none"
                      style={{ perspective: "1200px" }}
                    >
                      <div
                        className="relative w-full min-h-[220px] transition-transform duration-500"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: fcFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                        }}
                      >
                        {/* Front Face */}
                        <div
                          className="absolute inset-0 w-full h-full rounded-2xl p-6 flex flex-col items-center justify-center text-center border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                            {currentCard.front}
                          </p>
                        </div>

                        {/* Back Face */}
                        <div
                          className="absolute inset-0 w-full h-full rounded-2xl p-6 flex flex-col items-center justify-center text-center border bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/60"
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)"
                          }}
                        >
                          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                            {currentCard.back}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFcFlipped(false);
                          setFcIndex(i => (i > 0 ? i - 1 : fcCards.length - 1));
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        ← Thẻ trước
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFcMastered(prev => ({ ...prev, [currentCard.id]: false }));
                            setFcFlipped(false);
                            setFcIndex(i => (i < fcCards.length - 1 ? i + 1 : 0));
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 cursor-pointer"
                        >
                          Chưa nhớ
                        </button>
                        <button
                          type="button"
                          onClick={() => setFcFlipped(f => !f)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Lật thẻ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextMastered = { ...fcMastered, [currentCard.id]: true };
                            setFcMastered(nextMastered);
                            setFcFlipped(false);
                            if (Object.values(nextMastered).filter(Boolean).length === fcCards.length) {
                              recordPracticeAttempt(`Flashcard: ${fcCards.length}/${fcCards.length}`);
                            }
                            setFcIndex(i => (i < fcCards.length - 1 ? i + 1 : 0));
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Đã nhớ ✓
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFcFlipped(false);
                          setFcIndex(i => (i < fcCards.length - 1 ? i + 1 : 0));
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Thẻ sau →
                      </button>
                    </div>

                    {unmasteredCards.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                        <p className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                          Các thẻ đã đánh dấu Chưa nhớ ({unmasteredCards.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {unmasteredCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                const idxInCurrent = fcCards.findIndex(c => c.id === card.id);
                                setFcFlipped(false);
                                if (idxInCurrent !== -1) {
                                  setFcIndex(idxInCurrent);
                                } else {
                                  setFcCards(unmasteredCards);
                                  setFcIndex(unmasteredCards.findIndex(c => c.id === card.id));
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                              title={card.back}
                            >
                              {card.front}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: MULTIPLE CHOICE QUIZ */}
            {practiceTab === "mc" && (
              <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Đã trả lời: {mcAnsweredCount}/{mcList.length}
                    {mcAnsweredCount > 0 && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                        • Đúng {mcCorrectCount}/{mcAnsweredCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetMc(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Xáo trộn & Làm lại
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetMc(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Làm lại
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {mcList.map((q, qIdx) => {
                    const userChoice = mcAnswers[qIdx];
                    const isAnswered = Boolean(userChoice);
                    return (
                      <div key={q.id || qIdx} className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-3">
                          <span className="text-purple-600 mr-1.5">Câu {qIdx + 1}:</span>
                          {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const letter = getOptionLetter(opt, optIdx);
                            const isThisCorrect = letter === q.correctAnswer;
                            const isThisSelected = userChoice === letter;

                            let cls = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-purple-400";
                            if (isAnswered) {
                              if (isThisCorrect) {
                                cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold";
                              } else if (isThisSelected) {
                                cls = "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200";
                              } else {
                                cls = "border-slate-200/50 dark:border-slate-800 opacity-60";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => handleSelectMc(qIdx, letter)}
                                className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-all ${isAnswered ? "cursor-default" : "cursor-pointer"} ${cls}`}
                              >
                                <span>{opt}</span>
                                {isAnswered && isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {isAnswered && isThisSelected && !isThisCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && q.explanation && (
                          <p className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-300 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2.5">
                            <span className="font-bold">Giải thích: </span>{q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: FILL-IN-THE-BLANK VOCAB QUIZ (EN->VI / VI->EN) */}
            {practiceTab === "fill" && (
              <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                      Chế độ điền từ:
                    </span>
                    <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleSwitchFillMode("en-vi")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          fillMode === "en-vi"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Anh → Việt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchFillMode("vi-en")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          fillMode === "vi-en"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Việt → Anh
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchFillMode("ipa-en")}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          fillMode === "ipa-en"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        Phiên âm → Viết
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Đúng {fillCorrectCount}/{fillCheckedCount || fillList.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetFill(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Xáo trộn & Làm lại
                    </button>
                  </div>
                </div>

                {fillList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Chưa có câu hỏi điền từ cho bài này.</p>
                ) : (
                  <div className="space-y-3.5">
                    {fillList.map((q, idx) => {
                      const res = fillResults[idx];
                      const promptTerm =
                        fillMode === "en-vi"
                          ? q.englishTerm
                          : fillMode === "vi-en"
                            ? q.vietnameseMeaning
                            : (q.phonetic || q.vietnameseMeaning);
                      const promptSentence =
                        fillMode === "en-vi"
                          ? q.contextSentenceEn
                          : fillMode === "vi-en"
                            ? q.contextSentenceVi
                            : (q.phonetic ? `Nghĩa gợi ý: ${q.vietnameseMeaning}` : "Chưa có dữ liệu phiên âm cho bài cũ (bấm 'Tạo bộ câu hỏi mới' để cập nhật)");
                      const expectedAnswer = fillMode === "en-vi" ? q.vietnameseMeaning : q.englishTerm;

                      return (
                        <div key={q.id || idx} className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Câu {idx + 1} • {fillMode === "en-vi" ? "Nhập nghĩa Tiếng Việt" : fillMode === "vi-en" ? "Nhập từ Tiếng Anh" : "Nhìn phiên âm, viết từ Tiếng Anh"}
                              </span>
                              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                                {promptTerm}
                              </p>
                              {promptSentence && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                                  {fillMode === "ipa-en" ? promptSentence : `Ngữ cảnh: ${promptSentence}`}
                                </p>
                              )}
                            </div>

                            {!res?.checked && (
                              <button
                                type="button"
                                onClick={() => setFillHints(prev => ({ ...prev, [idx]: true }))}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer shrink-0"
                              >
                                <Lightbulb className="w-3 h-3" />
                                Gợi ý
                              </button>
                            )}
                          </div>

                          {fillHints[idx] && !res?.checked && (
                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              Gợi ý: Bắt đầu bằng "{expectedAnswer.slice(0, Math.min(2, expectedAnswer.length))}..." ({expectedAnswer.length} ký tự)
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              disabled={Boolean(res?.checked)}
                              value={fillInputs[idx] || ""}
                              onChange={(e) => setFillInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !res?.checked) {
                                  handleCheckFill(idx);
                                }
                              }}
                              placeholder={fillMode === "en-vi" ? "Nhập nghĩa tiếng Việt..." : "Nhập từ tiếng Anh..."}
                              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                            />
                            {!res?.checked && (
                              <button
                                type="button"
                                onClick={() => handleCheckFill(idx)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                              >
                                Kiểm tra
                              </button>
                            )}
                          </div>

                          {res?.checked && (
                            <div
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                res.isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                              }`}
                            >
                              {res.isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="font-bold">
                                  {res.isCorrect ? "Chính xác!" : `Chưa đúng. Đáp án chuẩn: ${expectedAnswer}`}
                                </p>
                                {q.explanation && (
                                  <p className="text-[11px] opacity-90 mt-0.5">{q.explanation}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: FOLDER EXPLORER & UPLOAD VIEW
  // ============================================================================
  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header + Create New Practice Folder */}
      <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold !text-slate-900 dark:!text-white">
                Trung tâm Luyện tập (Folder → Mục lớn → Bài tập nhỏ)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi tài liệu hoặc nhập chủ đề để AI tự chia thành các mục ôn tập gồm Flashcard, Quiz Trắc nghiệm & Quiz Điền từ (Anh ↔ Việt).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={countDropdownRef}>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Số câu/thẻ mỗi bài nhỏ:</span>
            <button
              type="button"
              onClick={() => setShowCountDropdown(v => !v)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-purple-400 dark:hover:border-purple-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer min-w-[185px]"
            >
              <span>{countOptions.find(o => o.value === itemCountPerLesson)?.label || "AI tự chia theo nội dung"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${showCountDropdown ? "rotate-180 text-purple-600" : ""}`} />
            </button>

            {showCountDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 p-1.5 bg-white/95 dark:bg-[#0f111a]/95 backdrop-blur-lg border border-slate-200/70 dark:border-white/10 rounded-xl shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150 flex flex-col gap-0.5">
                {countOptions.map((opt) => {
                  const isActive = itemCountPerLesson === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        setItemCountPerLesson(opt.value);
                        setShowCountDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "bg-purple-600/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* File upload button */}
          <div className="md:col-span-4">
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold text-purple-700 dark:text-purple-300 cursor-pointer transition-colors">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="truncate">
                {isUploading
                  ? "Đang đọc tài liệu..."
                  : uploadedFile
                    ? uploadedFile.name
                    : "Tải lên tài liệu (PDF, DOCX, XLSX, TXT...)"}
              </span>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          {/* Prompt input */}
          <div className="md:col-span-5">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ghi chú thêm hoặc nhập chủ đề (VD: Từ vựng TOEIC, Chương 1-5...)"
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Analyze button */}
          <div className="md:col-span-3">
            <button
              type="button"
              disabled={isAnalyzing || isUploading || Boolean(preloadProgress)}
              onClick={handleAnalyzeAndCreateFolder}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing || preloadProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAnalyzing
                ? "Đang phân tích..."
                : preloadProgress
                  ? `Chờ một chút... (${preloadProgress.done}/${preloadProgress.total})`
                  : "Tạo Folder Luyện tập"}
            </button>
          </div>
        </div>
      </div>

      {/* Folders + Selected Folder Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Folder List */}
        <div className="lg:col-span-4 space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Danh sách Folder tổng ({folders.length})
          </h3>
          {folders.length === 0 ? (
            <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-6 text-center text-xs text-slate-500">
              Chưa có Folder luyện tập nào. Hãy tải tài liệu lên để AI tự động chia mục ôn tập nhé!
            </div>
          ) : (
            folders.map(folder => {
              const isSelected = selectedFolder?.id === folder.id;
              const totalLessons = (folder.sections || []).reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    const exp = {};
                    (folder.sections || []).forEach(s => { exp[s.id] = true; });
                    setExpandedSections(exp);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-400 dark:border-purple-700 shadow-sm"
                      : "bg-white dark:bg-[#11131e] border-slate-200/70 dark:border-white/10 hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FolderOpen className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-purple-600" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {folder.folderTitle}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {folder.sections?.length || 0} mục lớn • {totalLessons} bài tập nhỏ
                        {folder.isVocabularyDoc && " • Từ vựng"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Xóa folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Sections & Lessons inside Selected Folder */}
        <div className="lg:col-span-8">
          {!selectedFolder ? (
            <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-12 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-purple-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Chọn một Folder bên trái để xem các Mục lớn & Bài tập nhỏ
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#11131e] border border-slate-200/70 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="border-b border-slate-100 dark:border-white/10 pb-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-extrabold !text-slate-900 dark:!text-white">
                    {selectedFolder.folderTitle}
                  </h2>
                  {selectedFolder.isVocabularyDoc && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                      Từ vựng (MC + Điền từ Anh ↔ Việt)
                    </span>
                  )}
                </div>
                {selectedFolder.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedFolder.description}
                  </p>
                )}
                {preloadProgress && preloadProgress.folderId === selectedFolder.id && (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-200">
                        <span>Đang tạo sẵn toàn bộ bài tập trong Folder...</span>
                        <span>{preloadProgress.done}/{preloadProgress.total} bài</span>
                      </div>
                      <div className="w-full h-1.5 bg-purple-200/70 dark:bg-purple-900/50 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${Math.round((preloadProgress.done / preloadProgress.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(selectedFolder.sections || []).map((section) => {
                  const isOpen = expandedSections[section.id] !== false;
                  return (
                    <div key={section.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !isOpen }))}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          <div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              {section.title}
                            </h3>
                            {section.summary && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {section.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          {section.lessons?.length || 0} bài nhỏ
                        </span>
                      </button>

                      {isOpen && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white dark:bg-[#11131e]">
                          {(section.lessons || []).map((lesson) => {
                            const isReady = hasLessonContent(lesson);
                            const isPreloadingThis = Boolean(preloadProgress && preloadProgress.folderId === selectedFolder.id && !isReady);

                            return (
                              <div
                                key={lesson.id}
                                onClick={() => {
                                  if (isPreloadingThis) return;
                                  handleOpenLesson(selectedFolder, section, lesson, false);
                                }}
                                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                                  isPreloadingThis
                                    ? "border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 opacity-70 cursor-not-allowed"
                                    : "border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer"
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                                      {lesson.title}
                                    </p>
                                    {isPreloadingThis ? (
                                      <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin shrink-0 mt-0.5" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                  {lesson.focus && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                      {lesson.focus}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-bold">
                                  <span
                                    className={
                                      isReady
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : isPreloadingThis
                                          ? "text-amber-600 dark:text-amber-400 flex items-center gap-1"
                                          : "text-purple-600 dark:text-purple-400"
                                    }
                                  >
                                    {isReady
                                      ? "Đã sẵn sàng • Nhấn để ôn tập"
                                      : isPreloadingThis
                                        ? "Chờ một chút... Đang tạo bài"
                                        : "Nhấn để tạo & luyện tập"}
                                  </span>
                                  {lesson.attempts > 0 && (
                                    <span className="text-slate-400">
                                      {lesson.attempts} lần {lesson.lastScore ? `(${lesson.lastScore})` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
