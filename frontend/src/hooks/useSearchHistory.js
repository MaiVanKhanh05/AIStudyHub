import { useState, useCallback } from "react";

const PREVIEW_COUNT = 10; // số mục hiển thị mặc định (không giới hạn lưu trữ)

/**
 * useSearchHistory
 * Manages a named search history stored in localStorage.
 * Stores ALL entries (no cap), but exposes PREVIEW_COUNT for display.
 *
 * @param {string} storageKey - unique localStorage key
 * @returns {{ history, recentHistory, addToHistory, removeFromHistory, clearHistory }}
 */
export function useSearchHistory(storageKey) {
  const readHistory = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const [history, setHistory] = useState(readHistory);

  const persist = (items) => {
    localStorage.setItem(storageKey, JSON.stringify(items));
    setHistory(items);
  };

  // Save keyword — deduplicate (case-insensitive), newest first, unlimited storage
  const addToHistory = useCallback(
    (keyword) => {
      const trimmed = keyword?.trim();
      if (!trimmed) return;

      const current = readHistory();
      const deduped = current.filter(
        (k) => k.toLowerCase() !== trimmed.toLowerCase()
      );
      persist([trimmed, ...deduped]); // prepend, no cap
    },
    [storageKey]
  );

  // Remove a specific keyword
  const removeFromHistory = useCallback(
    (keyword) => {
      const current = readHistory();
      persist(current.filter((k) => k !== keyword));
    },
    [storageKey]
  );

  // Clear everything
  const clearHistory = useCallback(() => {
    persist([]);
  }, [storageKey]);

  return {
    history,                               // all entries
    recentHistory: history.slice(0, PREVIEW_COUNT), // top 10 for preview
    addToHistory,
    removeFromHistory,
    clearHistory,
    PREVIEW_COUNT,
  };
}
