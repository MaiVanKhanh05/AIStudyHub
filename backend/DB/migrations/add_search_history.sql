-- Migration: add_search_history
-- Lưu lịch sử tìm kiếm của từng user
-- UNIQUE (user_id, keyword): nếu tìm lại cùng từ khóa thì cập nhật searched_at, không insert trùng

CREATE TABLE IF NOT EXISTS search_history (
    search_id   SERIAL PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL,
    keyword     VARCHAR(255) NOT NULL,
    searched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_search_history_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT UQ_search_history_user_keyword
        UNIQUE (user_id, keyword)
);

-- Index để query nhanh theo user
CREATE INDEX IF NOT EXISTS IDX_search_history_user_id
    ON search_history (user_id, searched_at DESC);
