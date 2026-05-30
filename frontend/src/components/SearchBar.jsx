export default function SearchBar({ search, setSearch }) {
  // Hàm xử lý khi người dùng thay đổi text, tự động chuẩn hóa chuỗi dữ liệu đầu vào
  const handleInputChange = (e) => {
    const value = e.target.value;
    // Bạn có thể xử lý thêm logic phụ ở đây nếu cần thiết trước khi cập nhật state
    setSearch(value);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto group">

      {/* ICON KÍNH LÚP (Tự động đổi màu xanh khi click vào ô input) */}
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none select-none text-base z-10">
        🔍
      </span>

      {/* Ô INPUT SEARCH */}
      <input
        value={search}
        onChange={handleInputChange}
        placeholder="Search documents, subjects, authors..."
        className="
          w-full 
          pl-12 pr-12 py-3
          bg-gray-100/70 backdrop-blur-md
          border border-transparent
          rounded-xl 
          text-sm text-gray-800 placeholder-gray-400 font-medium
          focus:outline-none 
          focus:bg-white
          focus:border-blue-500/50
          focus:ring-4 focus:ring-blue-500/10
          focus:shadow-[0_10px_25px_-5px_rgba(59,130,246,0.1)]
          transition-all duration-300 ease-out
        "
      />

      {/* NÚT XÓA NHANH (✕) - Chỉ xuất hiện khi ô input có chữ */}
      {search && (
        <button
          onClick={() => setSearch("")}
          type="button"
          className="
            absolute right-4 top-1/2 -translate-y-1/2 
            w-6 h-6 flex items-center justify-center 
            rounded-lg bg-gray-200/50 text-gray-500 
            hover:bg-red-50 hover:text-red-500
            text-[9px] font-bold
            transition-all duration-200 active:scale-95
            z-10
          "
        >
          ✕
        </button>
      )}

    </div>
  );
}