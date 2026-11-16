import React, { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, HelpCircle, ListChecks } from "lucide-react";

export default function InlineQuizWidget({ quizData }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showListView, setShowListView] = useState(false);

  if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    return null;
  }

  const questions = quizData.questions;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = questions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
  }, 0);

  const handleSelectOption = (qIdx, optionLetter) => {
    if (selectedAnswers[qIdx]) return; // Lock once answered
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optionLetter }));
  };

  const handleReset = () => {
    setSelectedAnswers({});
  };

  const getOptionLetter = (opt, optIdx) => {
    const match = String(opt).trim().match(/^([A-Da-d])[.):\s]/);
    if (match) return match[1].toUpperCase();
    return ["A", "B", "C", "D"][optIdx] || String(optIdx + 1);
  };

  return (
    <div className="w-full rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-white dark:bg-[#18181B] shadow-sm overflow-hidden my-1">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-b border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600 text-white">
            <ListChecks className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
              {quizData.title || "Bài Quiz ôn tập"}
            </h4>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {questions.length} câu hỏi • Đã làm {answeredCount}/{questions.length}
              {answeredCount > 0 && ` • Đúng ${correctCount}/${answeredCount}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowListView(v => !v)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {showListView ? "Chế độ làm bài" : "Xem đáp án"}
          </button>
          {answeredCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Làm lại
            </button>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="p-3.5 space-y-3.5 max-h-[520px] overflow-y-auto custom-scrollbar">
        {questions.map((q, qIdx) => {
          const userChoice = selectedAnswers[qIdx];
          const isAnswered = Boolean(userChoice) || showListView;
          const isCorrect = userChoice === q.correctAnswer;

          return (
            <div
              key={q.id || qIdx}
              className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800"
            >
              <div className="flex items-start gap-2 mb-2.5">
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold">
                  {qIdx + 1}
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {q.question}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-1.5 pl-7">
                {q.options.map((opt, optIdx) => {
                  const letter = getOptionLetter(opt, optIdx);
                  const isThisCorrect = letter === q.correctAnswer;
                  const isThisSelected = userChoice === letter;

                  let btnClass =
                    "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20";

                  if (isAnswered) {
                    if (isThisCorrect) {
                      btnClass =
                        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold";
                    } else if (isThisSelected && !isThisCorrect) {
                      btnClass =
                        "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200";
                    } else {
                      btnClass =
                        "border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(qIdx, letter)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] font-medium transition-all flex items-center justify-between gap-2 ${
                        isAnswered ? "cursor-default" : "cursor-pointer"
                      } ${btnClass}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isThisCorrect && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswered && isThisSelected && !isThisCorrect && (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && q.explanation && (
                <div className="mt-2.5 ml-7 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold">
                      {userChoice ? (isCorrect ? "Chính xác! " : `Đáp án đúng là ${q.correctAnswer}. `) : `Đáp án ${q.correctAnswer}: `}
                    </span>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
