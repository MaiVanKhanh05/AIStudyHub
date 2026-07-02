import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
    Clock, ArrowLeft, CheckCircle2, XCircle, AlertCircle, 
    RotateCcw, Award, Sparkles, ChevronRight, ChevronLeft, BookOpen, Tag 
} from "lucide-react";

const LABELS = ["A", "B", "C", "D"];

export default function QuizPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Quiz state
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Test taking state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: selectedIndex }
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
    const timerRef = useRef(null);

    // Results state
    const [result, setResult] = useState(null); // { score, total, review: [...] }
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Fetch quiz data on mount
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                const res = await axios.get(`http://localhost:5000/api/quizzes/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setQuiz(res.data);
                
                // Initialize answers mapping
                const initialAnswers = {};
                res.data.questions.forEach(q => {
                    initialAnswers[q.questionId] = null;
                });
                setSelectedAnswers(initialAnswers);
                
                // Start timer
                setTimeSpentSeconds(0);
                timerRef.current = setInterval(() => {
                    setTimeSpentSeconds(prev => prev + 1);
                }, 1000);
            } catch (err) {
                console.error("Failed to load quiz details:", err);
                toast.error(err.response?.data?.error || "Không thể tải bài trắc nghiệm này.");
                navigate("/");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id, navigate]);

    // Handle answer selection
    const handleSelectOption = (questionId, optionIndex) => {
        if (result) return; // Disable after submission
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    // Format time spent
    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Handle Quiz submission (Open Custom Confirm Modal)
    const handleSubmitQuiz = () => {
        if (submitting) return;
        setShowConfirmModal(true);
    };

    // Actual submission execution
    const executeSubmitQuiz = async () => {
        setShowConfirmModal(false);
        if (submitting) return;

        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            const answersPayload = Object.entries(selectedAnswers).map(([qId, index]) => ({
                questionId: Number(qId),
                answer: index
            }));

            const res = await axios.post(`http://localhost:5000/api/quizzes/${id}/submit`, {
                answers: answersPayload,
                timeSpentSeconds: timeSpentSeconds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setResult(res.data);
            setCurrentQuestionIndex(0); // Jump back to first question for review
            toast.success("Nộp bài thi trắc nghiệm thành công!");
        } catch (err) {
            console.error("Quiz submission failed:", err);
            toast.error(err.response?.data?.error || "Nộp bài thất bại. Vui lòng thử lại.");
            // Restart timer on error
            timerRef.current = setInterval(() => {
                setTimeSpentSeconds(prev => prev + 1);
            }, 1000);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Retry Quiz
    const handleRetry = async () => {
        setResult(null);
        setCurrentQuestionIndex(0);
        setTimeSpentSeconds(0);
        
        // Reset selections
        const resetAnswers = {};
        quiz.questions.forEach(q => {
            resetAnswers[q.questionId] = null;
        });
        setSelectedAnswers(resetAnswers);

        // Restart timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeSpentSeconds(prev => prev + 1);
        }, 1000);
        
        toast.info("Đã làm lại bài Quiz từ đầu!");
    };

    // Handle Exit
    const handleExit = () => {
        const fromPath = location.state?.from;
        const openDocId = location.state?.openDocId || quiz?.documentId;
        
        if (fromPath) {
            navigate(fromPath, { state: { openDocId } });
        } else if (openDocId) {
            navigate("/", { state: { openDocId } });
        } else {
            navigate("/");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-center p-6">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-purple-650 animate-spin" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-350">Đang chuẩn bị đề thi ôn tập...</h3>
                <p className="mt-1 text-[10px] text-purple-400 font-extrabold uppercase tracking-widest leading-none">AIStudyHub Smart System</p>
            </div>
        );
    }

    if (!quiz) return null;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

    return (
        <div className="min-h-screen bg-[#090a10] text-slate-100 py-8 px-4 flex flex-col items-center select-none font-sans">
            {/* Header Area */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-6">
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg bg-slate-900 border border-slate-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Thoát
                </button>
                <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-purple-450 animate-pulse" />
                    <span className="text-sm font-mono font-bold tracking-wider">
                        {formatTime(result ? result.timeSpentSeconds : timeSpentSeconds)}
                    </span>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left side: Navigation Map */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl md:col-span-1 flex flex-col gap-4.5 h-fit shadow-md">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-350 mb-1">
                            Bản đồ câu hỏi
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold">
                            {result ? "Xem lại kết quả ôn tập" : "Lựa chọn các câu hỏi để di chuyển nhanh"}
                        </p>
                    </div>
                    
                    {/* Numbers Grid */}
                    <div className="grid grid-cols-5 gap-2.5">
                        {quiz.questions.map((q, idx) => {
                            const isCurrent = idx === currentQuestionIndex;
                            const isAnswered = selectedAnswers[q.questionId] !== null;
                            
                            let buttonStyle = "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700/60";
                            
                            if (result) {
                                // Result review state styles
                                const reviewItem = result.review.find(r => r.questionId === q.questionId);
                                if (reviewItem?.isCorrect) {
                                    buttonStyle = "bg-emerald-600/25 hover:bg-emerald-600/35 border-emerald-500/50 text-emerald-400";
                                } else {
                                    buttonStyle = "bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/50 text-rose-450";
                                }
                            } else {
                                // Test taking styles
                                if (isCurrent) {
                                    buttonStyle = "bg-purple-600 hover:bg-purple-700 text-white border-purple-500 font-extrabold ring-2 ring-purple-500/20";
                                } else if (isAnswered) {
                                    buttonStyle = "bg-[#27272a] text-slate-200 border-purple-500/30 font-bold";
                                }
                            }

                            return (
                                <button
                                    key={q.questionId}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`aspect-square w-full rounded-xl border text-xs flex items-center justify-center transition-all cursor-pointer ${buttonStyle}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-slate-800 pt-4 flex flex-col gap-2 select-none">
                        {!result ? (
                            <>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <div className="w-2.5 h-2.5 rounded bg-purple-600 border border-purple-500" />
                                    <span>Đang xem</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <div className="w-2.5 h-2.5 rounded bg-[#27272a] border border-purple-500/30" />
                                    <span>Đã trả lời</span>
                                </div>
                                <button
                                    onClick={handleSubmitQuiz}
                                    disabled={submitting}
                                    className="w-full py-2.5 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-md mt-2 flex items-center justify-center"
                                >
                                    {submitting ? "Đang chấm điểm..." : "Nộp bài thi"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleRetry}
                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Làm lại Quiz
                            </button>
                        )}
                    </div>
                </div>

                {/* Right side: Active Question Card & Review */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Scoreboard block if result exists */}
                    {result && (
                        <div className="bg-gradient-to-br from-slate-900/90 to-purple-950/20 border border-purple-900/30 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-md relative overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
                            {/* Score Ring */}
                            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                                    <circle 
                                        cx="50" 
                                        cy="50" 
                                        r="40" 
                                        stroke="url(#purpleGrad)" 
                                        strokeWidth="8" 
                                        fill="none" 
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * (result.score / result.total))}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#c084fc" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center select-none">
                                    <span className="text-2xl font-black tracking-tighter text-white">
                                        {result.score}/{result.total}
                                    </span>
                                    <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-wider">
                                        Đúng
                                    </span>
                                </div>
                            </div>
                            {/* Analytics info */}
                            <div className="flex-grow flex flex-col gap-2.5 text-center md:text-left select-none">
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <Award className="w-5 h-5 text-yellow-500" />
                                    <h2 className="text-base font-black text-white">Quiz Completed!</h2>
                                </div>
                                <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                                    Bạn đã làm đúng <strong className="text-emerald-450 font-bold">{Math.round((result.score / result.total) * 100)}%</strong> nội dung bài Quiz trắc nghiệm về tài liệu trong thời gian <strong className="text-white font-bold">{formatTime(result.timeSpentSeconds)}</strong>.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-1.5">
                                    {quiz.topics.map((t, i) => (
                                        <span key={i} className="px-2.5 py-1 text-[8.5px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Question Card */}
                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-md p-6 flex flex-col gap-6">
                        {/* Progress and Topic */}
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                            <span className="text-xs text-purple-450 font-black tracking-wider uppercase select-none">
                                Câu hỏi {currentQuestionIndex + 1} / {totalQuestions}
                            </span>
                            {currentQuestion.topic && (
                                <span className="px-2.5 py-1 text-[9px] font-bold bg-slate-800 border border-slate-700/80 text-slate-300 rounded-lg flex items-center gap-1.5 select-none">
                                    <Tag className="w-3 h-3 text-purple-400" />
                                    {currentQuestion.topic}
                                </span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-650 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {/* Question Text */}
                        <div className="text-sm font-bold text-slate-200 leading-relaxed text-left">
                            {currentQuestion.questionText}
                        </div>

                        {/* Options Stack */}
                        <div className="flex flex-col gap-3">
                            {currentQuestion.options.map((opt, idx) => {
                                const isSelected = selectedAnswers[currentQuestion.questionId] === idx;
                                
                                let containerStyle = "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-350 hover:text-slate-200";
                                let badgeStyle = "bg-slate-800 text-slate-400 border-slate-750";

                                if (result) {
                                    // Submit State styles mapping
                                    const reviewItem = result.review.find(r => r.questionId === currentQuestion.questionId);
                                    const isCorrectOpt = reviewItem?.correctAnswer === idx;
                                    const isUserSelected = reviewItem?.selectedAnswer === idx;
                                    
                                    if (isCorrectOpt) {
                                        // correct option gets highlighted in green
                                        containerStyle = "bg-emerald-600/10 border-emerald-500/50 text-emerald-300 font-bold pointer-events-none ring-2 ring-emerald-500/10";
                                        badgeStyle = "bg-emerald-600 text-white border-emerald-500";
                                    } else if (isUserSelected) {
                                        // user incorrect selection gets highlighted in red
                                        containerStyle = "bg-rose-600/10 border-rose-500/50 text-rose-350 font-bold pointer-events-none ring-2 ring-rose-500/10";
                                        badgeStyle = "bg-rose-600 text-white border-rose-500";
                                    } else {
                                        containerStyle = "bg-slate-900/50 border-slate-850 text-slate-500 pointer-events-none";
                                        badgeStyle = "bg-slate-900 text-slate-600 border-slate-850";
                                    }
                                } else {
                                    // Active test taking styles
                                    if (isSelected) {
                                        containerStyle = "bg-purple-600/10 border-purple-500 text-purple-200 font-bold ring-2 ring-purple-500/10";
                                        badgeStyle = "bg-purple-600 text-white border-purple-500";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectOption(currentQuestion.questionId, idx)}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all text-xs cursor-pointer ${containerStyle}`}
                                    >
                                        <span className={`w-6 h-6 shrink-0 rounded-lg border text-[10px] font-black flex items-center justify-center transition-all ${badgeStyle}`}>
                                            {LABELS[idx]}
                                        </span>
                                        <span className="leading-snug">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Navigation Actions */}
                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 select-none">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors py-2 px-3 rounded-lg cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Câu trước
                            </button>
                            
                            {currentQuestionIndex < totalQuestions - 1 ? (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg cursor-pointer"
                                >
                                    Câu tiếp
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                !result && (
                                    <button
                                        onClick={handleSubmitQuiz}
                                        disabled={submitting}
                                        className="py-2 px-4 bg-purple-650 hover:bg-purple-750 text-white text-xs font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                    >
                                        Nộp bài
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Explanation Card (Post-submit Review Mode Only) */}
                    {result && (
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm text-left animate-in slide-in-from-bottom duration-300">
                            <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-450 tracking-wider mb-2.5 select-none">
                                <BookOpen className="w-4 h-4 text-purple-500" />
                                <span>Lời giải chi tiết từ AI</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                                {result.review.find(r => r.questionId === currentQuestion.questionId)?.explanation || "Không có lời giải thích chi tiết."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Premium Confirm Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => !submitting && setShowConfirmModal(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 text-left animate-in zoom-in-95 duration-200">
                        {/* Alert Icon & Header */}
                        <div className="flex items-start gap-4 mb-4 select-none">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                                    Xác nhận nộp bài thi
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold mt-1">
                                    Bạn có chắc chắn muốn nộp bài thi trắc nghiệm này để chấm điểm không?
                                </p>
                            </div>
                        </div>

                        {/* Unanswered count detail */}
                        {quiz && (
                            <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 mb-6 select-none">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-400">Tổng số câu hỏi:</span>
                                    <span className="text-slate-200">{quiz.questions.length} câu</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold mt-1.5">
                                    <span className="text-slate-400">Số câu đã làm:</span>
                                    <span className="text-emerald-400">
                                        {quiz.questions.filter(q => selectedAnswers[q.questionId] !== null).length} câu
                                    </span>
                                </div>
                                {quiz.questions.filter(q => selectedAnswers[q.questionId] === null).length > 0 && (
                                    <div className="flex justify-between items-center text-xs font-bold mt-1.5 border-t border-slate-800/40 pt-1.5">
                                        <span className="text-rose-400/90">Số câu chưa trả lời:</span>
                                        <span className="text-rose-400 font-black">
                                            {quiz.questions.filter(q => selectedAnswers[q.questionId] === null).length} câu
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 select-none">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-50 text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={executeSubmitQuiz}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer shadow-md flex items-center gap-1.5"
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Đang nộp...
                                    </>
                                ) : (
                                    "Nộp bài thi"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
