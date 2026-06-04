import * as searchHistoryRepository from "../repositories/searchHistory.repository.js";

// Lưu từ khóa tìm kiếm (upsert)
export const saveSearch = async (userId, keyword) => {
    if (!userId || !keyword || !keyword.trim()) return null;
    return await searchHistoryRepository.saveSearchKeyword(userId, keyword.trim());
};

// Lấy toàn bộ lịch sử tìm kiếm của user
export const getHistory = async (userId) => {
    if (!userId) return [];
    return await searchHistoryRepository.getSearchHistory(userId);
};

// Xóa một mục lịch sử
export const deleteItem = async (searchId, userId) => {
    if (!searchId || !userId) return false;
    return await searchHistoryRepository.deleteSearchHistoryItem(searchId, userId);
};

// Xóa toàn bộ lịch sử của user
export const clearAll = async (userId) => {
    if (!userId) return 0;
    return await searchHistoryRepository.clearSearchHistory(userId);
};
