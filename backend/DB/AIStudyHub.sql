-- 1. TABLE: users 
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY, -- Dùng mã SV/GV làm Khóa chính
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'STUDENT',
    max_storage_bytes BIGINT DEFAULT 2147483648,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL, -- UNIQUE để đảm bảo quan hệ 1-1
    avatar_url VARCHAR(500),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    bio TEXT,
    address VARCHAR(255),
    
    CONSTRAINT FK_userprofile_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

-- 2. TABLE: password_reset 
CREATE TABLE password_reset (
    reset_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- Đồng bộ kiểu dữ liệu
    token_hash VARCHAR(255) NOT NULL,
    expiry_time TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_password_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- xác thực thông qua OTP
   CREATE TABLE otp_verifications (
                otp_id SERIAL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                purpose VARCHAR(30) NOT NULL,
                expiry_time TIMESTAMPTZ NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

-- 3. TABLE: subject
CREATE TABLE subject (
    subject_code VARCHAR(20) PRIMARY KEY,
    subject_name VARCHAR(150) NOT NULL
);

-- 4. TABLE: document 
CREATE TABLE document (
    document_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- Đồng bộ kiểu dữ liệu
    subject_code VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    upload_status VARCHAR(20) DEFAULT 'SUCCESS',
    visibility VARCHAR(20) DEFAULT 'PRIVATE',
    ai_summary TEXT,
    views INT DEFAULT 0,
    downloads INT DEFAULT 0,
    upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_document_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_document_subject FOREIGN KEY (subject_code) REFERENCES subject(subject_code) ON UPDATE CASCADE
);
-- 1. Bảng tags (Bây giờ nó ĐỘC LẬP, chỉ chứa danh sách tag duy nhất)
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL -- UNIQUE để không bao giờ có 2 tag trùng tên
);

-- 2. Bảng subject_tags (Bảng trung gian: Nối môn học với tag)
CREATE TABLE subject_tags (
    subject_code VARCHAR(20) NOT NULL,
    tag_id INT NOT NULL,
    
    PRIMARY KEY (subject_code, tag_id),
    CONSTRAINT FK_subjtag_subject FOREIGN KEY (subject_code) REFERENCES subject(subject_code) ON DELETE CASCADE,
    CONSTRAINT FK_subjtag_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- 3. Bảng document_tags (Vẫn giữ nguyên: Nối tài liệu với tag)
CREATE TABLE document_tags (
    document_id INT NOT NULL,
    tag_id INT NOT NULL,
    
    PRIMARY KEY (document_id, tag_id),
    CONSTRAINT FK_doctag_doc FOREIGN KEY (document_id) REFERENCES document(document_id) ON DELETE CASCADE,
    CONSTRAINT FK_doctag_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);



-- A. Tạo bảng tạm để chứa dữ liệu mapping thô
CREATE TEMP TABLE temp_subject_tags (subject_code VARCHAR(20), tag_name VARCHAR(50));


-- 5. TABLE: chat_session 
CREATE TABLE chat_session (
    session_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- Đồng bộ kiểu dữ liệu
    document_id INT NULL,
    title VARCHAR(255) DEFAULT 'Cuộc hội thoại mới',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_chatsession_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_chatsession_doc FOREIGN KEY (document_id) REFERENCES document(document_id) ON DELETE SET NULL
);
--TẠO BẢNG LƯU LỊCH SỬ HOẠT ĐỘNG (LOG)
CREATE TABLE system_log (
    log_id SERIAL PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,       -- Admin nào thực hiện hành động
    action_type VARCHAR(50) NOT NULL,    -- Loại hành động (VD: DELETE_USER, RESET_PASSWORD)
    target_user_id VARCHAR(50),          -- Tài khoản bị tác động (nếu có)
    description TEXT,                    -- Chi tiết hoạt động
    ip_address VARCHAR(45),              -- Địa chỉ IP (tuỳ chọn)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Ràng buộc khóa ngoại: Đảm bảo admin_id phải tồn tại trong bảng users
    CONSTRAINT FK_syslog_admin FOREIGN KEY (admin_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);