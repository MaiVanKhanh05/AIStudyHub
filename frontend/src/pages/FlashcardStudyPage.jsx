import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
    ArrowLeft, ChevronLeft, ChevronRight, BookOpen, 
    Tag, HelpCircle, Layers, Star, RotateCw 
} from "lucide-react";

export default function FlashcardStudyPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [set, setSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                const res = await axios.get(`http://localhost:5000/api/flashcards/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSet(res.data);
            } catch (err) {
                console.error("Failed to load flashcard set details:", err);
                toast.error(err.response?.data?.error || "Không thể tải bộ thẻ ghi nhớ này.");
                navigate("/");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetails();
        }
    }, [id, navigate]);

    const handleExit = () => {
        const fromPath = location.state?.from;
        const openDocId = location.state?.openDocId || set?.documentId;
        
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
                <h3 className="mt-4 text-sm font-bold text-slate-350">Đang sắp xếp bộ thẻ ghi nhớ...</h3>
                <p className="mt-1 text-[10px] text-purple-400 font-extrabold uppercase tracking-widest leading-none">AIStudyHub Scholar System</p>
            </div>
        );
    }

    if (!set || !set.flashcards || set.flashcards.length === 0) {
        return (
            <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-center p-6">
                <p className="text-sm font-bold text-slate-400">Bộ thẻ ghi nhớ này trống hoặc không có thẻ nào hoạt động.</p>
                <button 
                    onClick={handleExit}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-xs font-bold rounded-xl transition-all"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    const currentCard = set.flashcards[currentCardIndex];
    const totalCards = set.flashcards.length;
    const progressPercent = Math.round(((currentCardIndex + 1) / totalCards) * 100);

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setIsFlipped(false);
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentCardIndex < totalCards - 1) {
            setIsFlipped(false);
            setCurrentCardIndex(prev => prev + 1);
        }
    };

    return (
        <div className="min-h-screen bg-[#090a10] text-slate-100 py-8 px-4 flex flex-col items-center select-none font-sans overflow-x-hidden">
            {/* Header Area */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-8">
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-xl bg-slate-900 border border-slate-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Thoát
                </button>
                <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-4.5 py-2 rounded-xl">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold">
                        Thẻ {currentCardIndex + 1} / {totalCards}
                    </span>
                </div>
            </div>

            {/* Set Title Banner */}
            <div className="w-full max-w-2xl text-center mb-6">
                <h2 className="text-lg md:text-xl font-black text-white tracking-wide leading-snug">
                    {set.title}
                </h2>
                {set.description && (
                    <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed max-w-lg mx-auto">
                        {set.description}
                    </p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-2xl h-1.5 bg-slate-900 border border-slate-850 rounded-full mb-8 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Flashcard 3D perspective container */}
            <div className="w-full max-w-2xl aspect-[1.6/1] md:aspect-[1.8/1] relative cursor-pointer" style={{ perspective: "1200px" }}>
                <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="absolute inset-0 w-full h-full transition-transform duration-500"
                    style={{ 
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                    }}
                >
                    {/* FRONT SIDE (Question) */}
                    <div 
                        className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-xl"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                            <span className="px-2.5 py-1 text-[8.5px] font-black tracking-widest uppercase bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md">
                                {currentCard.cardType || "DEFINITION"}
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4 text-center">
                            <h3 className="text-base md:text-lg font-bold text-slate-100 leading-relaxed font-sans select-text max-h-full overflow-y-auto px-2">
                                {currentCard.front}
                            </h3>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-2">
                            <RotateCw className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                            <span>Click vào thẻ để xem đáp án</span>
                        </div>
                    </div>

                    {/* BACK SIDE (Answer) */}
                    <div 
                        className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 to-purple-950/15 border border-purple-900/20 dark:border-purple-800/30 rounded-3xl p-8 flex flex-col justify-between shadow-xl"
                        style={{ 
                            backfaceVisibility: "hidden", 
                            transform: "rotateY(180deg)" 
                        }}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                            <span className="px-2.5 py-1 text-[8.5px] font-black tracking-widest uppercase bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md">
                                Đáp án
                            </span>
                            {currentCard.topic && (
                                <span className="px-2.5 py-1 text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-350 rounded-lg flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-purple-400" />
                                    {currentCard.topic}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col justify-center py-4 text-left overflow-y-auto custom-scrollbar select-text pr-2">
                            <p className="text-sm font-bold text-slate-150 leading-relaxed">
                                {currentCard.back}
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-2">
                            <RotateCw className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                            <span>Click vào thẻ để xem câu hỏi</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="w-full max-w-2xl flex items-center justify-between mt-8 select-none">
                <button
                    onClick={handlePrev}
                    disabled={currentCardIndex === 0}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition-colors py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Thẻ trước
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentCardIndex === totalCards - 1}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition-colors py-3 px-5 rounded-xl bg-slate-900 border border-slate-800 disabled:cursor-not-allowed cursor-pointer"
                >
                    Thẻ tiếp
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
