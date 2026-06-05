export default function Pagination({ page, setPage, totalPages = 1 }) {
  if (totalPages <= 1) return null;

  // Thuật toán tự động tính toán hiển thị các số trang (Ví dụ: 1 ... 4 5 6 ... 10)
  const getPages = () => {
    const pages = [];
    const delta = 1;

    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);

    if (left > 2) pages.push("...");

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none animate-in fade-in duration-300">
      {/* TEXT THÔNG TIN TRANG CHỮ IN HOA NHỎ GỌN */}
      <p className="text-[10px] font-bold tracking-wider text-slate-450 dark:text-slate-500 uppercase">
        Page {page} of {totalPages}
      </p>

      {/* THANH ĐIỀU HƯỚNG LIỀN KHỐI (NỀN KÍNH MỜ) */}
      <div className="flex items-center gap-1 bg-white/60 dark:bg-[#0f111a]/45 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:shadow-none">

        {/* NÚT QUAY LẠI (PREV) */}
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="
            px-4 h-9
            rounded-xl text-xs font-semibold
            bg-transparent text-slate-650 dark:text-slate-400
            hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100
            disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400
            disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95
          "
        >
          ← Prev
        </button>

        {/* DANH SÁCH CÁC SỐ TRANG ĐỂ CLICK NHANH */}
        <div className="flex items-center gap-1">
          {getPages().map((p, index) =>
            p === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="w-8 h-9 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-xs"
              >
                ...
              </span>
            ) : (
              <button
                key={`page-${index}`}
                onClick={() => setPage(p)}
                className={`
                  w-9 h-9
                  rounded-xl
                  text-xs font-bold
                  transition-all duration-300 active:scale-95
                  ${page === p
                    ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-md shadow-purple-500/15 scale-105 border-none"
                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  }
                `}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* NÚT TIẾP THEO (NEXT) */}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          className="
            px-4 h-9
            rounded-xl text-xs font-semibold
            bg-transparent text-slate-650 dark:text-slate-400
            hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100
            disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400
            disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95
          "
        >
          Next →
        </button>

      </div>
    </div>
  );
}