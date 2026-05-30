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
    <div className="mt-12 flex flex-col items-center gap-3 select-none animate-in fade-in duration-300">

      {/* TEXT THÔNG TIN TRANG CHỮ IN HOA NHỎ GỌN */}
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
        Page {page} of {totalPages}
      </p>

      {/* THANH ĐIỀU HƯỚNG LIỀN KHỐI (NỀN KÍNH MỜ) */}
      <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">

        {/* NÚT QUAY LẠI (PREV) */}
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="
            px-4 h-10
            rounded-xl text-xs font-semibold
            bg-transparent text-gray-600
            hover:bg-gray-50 hover:text-gray-900
            disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600
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
                className="w-8 h-10 flex items-center justify-center text-gray-400 font-bold text-xs"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`
                  w-10 h-10
                  rounded-xl
                  text-xs font-bold
                  transition-all duration-300 active:scale-95
                  ${page === p
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20 scale-105"
                    : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
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
            px-4 h-10
            rounded-xl text-xs font-semibold
            bg-transparent text-gray-600
            hover:bg-gray-50 hover:text-gray-900
            disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600
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