import { Search, X } from "lucide-react";

export default function SearchBar({ search, setSearch, placeholder = "Tìm kiếm tài liệu, môn học, tác giả...", className = "max-w-2xl mx-auto" }) {
  const handleInputChange = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className={`relative w-full group ${className} select-none`}>
      {/* Sleek Glassmorphic Outer Wrapper */}
      <div className="relative p-1 rounded-xl bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 shadow-sm transition-all duration-300 focus-within:border-purple-500/35 focus-within:shadow-[0_8px_30px_rgba(168,85,247,0.05)]">
        
        {/* Left Side Dynamic Lucide Search Icon */}
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors duration-300 pointer-events-none z-10" />

        {/* Search Input Box */}
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="
            w-full 
            rounded-lg 
            bg-white/80 dark:bg-[#0c0d13]/80 
            border-none 
            pl-11 pr-11 py-2.5 
            text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 
            text-slate-800 dark:text-slate-100 
            focus:outline-none 
            focus:ring-1 focus:ring-purple-500/40 
            transition-all duration-300
          "
        />

        {/* Quick Clear Lucide X Button */}
        {search && (
          <button
            onClick={() => setSearch("")}
            type="button"
            className="
              absolute right-4 top-1/2 -translate-y-1/2 
              w-5 h-5 flex items-center justify-center 
              rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 
              dark:bg-slate-850 dark:hover:bg-red-950/30 dark:hover:text-red-400 
              transition-all duration-200 active:scale-95
              z-10
            "
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}