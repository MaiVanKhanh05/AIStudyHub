import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Layers, List } from "lucide-react";

export default function InlineFlashcardWidget({ flashcardData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!flashcardData || !Array.isArray(flashcardData.flashcards) || flashcardData.flashcards.length === 0) {
    return null;
  }

  const cards = flashcardData.flashcards;
  const currentCard = cards[currentIndex] || cards[0];

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="w-full rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-white dark:bg-[#18181B] shadow-sm overflow-hidden my-1">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              {flashcardData.title || "Bộ thẻ ghi nhớ Flashcard"}
            </h4>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {cards.length} thẻ ghi nhớ • Thẻ {currentIndex + 1}/{cards.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <List className="w-3 h-3" />
          {showAll ? "Chế độ lật thẻ" : "Xem tất cả"}
        </button>
      </div>

      {showAll ? (
        <div className="p-3.5 space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar">
          {cards.map((card, idx) => (
            <div
              key={card.id || idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2.5"
            >
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Thẻ {idx + 1} • Mặt trước
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-relaxed">
                  {card.front}
                </p>
              </div>
              <div className="md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Mặt sau
                </span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center gap-3">
          {/* Interactive 3D Flip Card */}
          <div
            onClick={() => setIsFlipped(f => !f)}
            className="w-full cursor-pointer select-none"
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative w-full min-h-[160px] transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
              }}
            >
              {/* Front Face */}
              <div
                className="absolute inset-0 w-full h-full rounded-xl p-5 flex flex-col items-center justify-center text-center border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {currentCard.front}
                </p>
              </div>

              {/* Back Face */}
              <div
                className="absolute inset-0 w-full h-full rounded-xl p-5 flex flex-col items-center justify-center text-center border bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/60"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)"
                }}
              >
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Trước
            </button>

            <button
              type="button"
              onClick={() => setIsFlipped(f => !f)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Lật thẻ
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Sau
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
