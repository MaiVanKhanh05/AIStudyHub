import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Sparkles, Tag, ChevronRight } from "lucide-react";

export default function QuizCard({ quizId }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                const res = await axios.get(`http://localhost:5000/api/quizzes/${quizId}/meta`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMeta(res.data);
            } catch (err) {
                console.error("Failed to load quiz metadata for card:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (quizId) {
            fetchMeta();
        }
    }, [quizId]);

    if (loading) {
        return (
            <div className="my-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse max-w-sm w-full select-none text-left">
                <div className="w-20 h-3 bg-purple-500/20 rounded-full mb-3" />
                <div className="w-48 h-4.5 bg-slate-850 rounded-full mb-2" />
                <div className="w-24 h-3 bg-slate-850 rounded-full mb-4" />
                <div className="w-full h-9 bg-purple-950/20 rounded-xl" />
            </div>
        );
    }

    if (error || !meta) {
        return (
            <div className="my-3 p-4 bg-slate-900/40 border border-rose-900/20 rounded-2xl max-w-sm text-left select-none">
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">
                    ⚠️ Quiz Error
                </div>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Không thể tải thông tin bài Quiz hoặc bài thi đã bị gỡ bỏ.
                </p>
            </div>
        );
    }

    return (
        <div className="my-3 p-4 bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300 max-w-sm text-left select-none relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
            
            {/* Header Badge */}
            <div className="flex items-center gap-1.5 mb-2.5 text-emerald-600 dark:text-emerald-450 font-black text-[9px] uppercase tracking-widest leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Quiz Created</span>
            </div>

            {/* Quiz Title */}
            <h4 className="text-sm font-bold text-slate-855 dark:text-slate-100 mb-1 leading-snug tracking-wide group-hover:text-purple-650 dark:group-hover:text-purple-300 transition-colors">
                {meta.title}
            </h4>

            {/* Count of questions */}
            <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold mb-3 uppercase tracking-wider">
                {meta.count} câu hỏi trắc nghiệm
            </p>

            {/* Topics List */}
            {meta.topics && meta.topics.length > 0 && (
                <div className="mb-4 select-none">
                    <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        <Tag className="w-3 h-3 text-purple-500" />
                        <span>Chủ đề bao phủ</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {meta.topics.map((topic, i) => (
                            <span 
                                key={i} 
                                className="px-2.5 py-1 text-[9.5px] font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-500/10 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full transition-all duration-200"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Join Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/quiz/${meta.quizId}`, {
                        state: {
                            from: location.pathname,
                            openDocId: meta.documentId
                        }
                    });
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-750 dark:bg-purple-650 dark:hover:bg-purple-750 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-1 leading-none animate-in fade-in duration-200"
            >
                Bắt đầu làm Quiz
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
        </div>
    );
}
