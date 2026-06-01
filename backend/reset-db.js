import pool from "./DB/db.js";
import fs from "fs";
import path from "path";

async function reset() {
  try {
    console.log("Bắt đầu đồng bộ lại Database schema...");
    
    // 1. Drop các bảng cũ theo thứ tự ràng buộc khóa ngoại
    const tablesToDrop = [
      "system_log",
      "chat_message",
      "chat_session",
      "document_tag",
      "tag",
      "document",
      "subject",
      "otp_verifications",
      "password_reset",
      "user_profiles",
      "users"
    ];
    
    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`Đã xóa bảng: ${table}`);
      } catch (err) {
        console.warn(`Lưu ý khi xóa bảng ${table}:`, err.message);
      }
    }

    // 2. Đọc file SQL và khởi tạo cấu trúc bảng mới
    const sqlPath = path.resolve("DB", "AIStudyHub.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    
    console.log("Đang nạp cấu trúc từ file AIStudyHub.sql...");
    await pool.query(sqlContent);
    console.log("Đồng bộ Database thành công! Các bảng đã được tạo đúng định dạng chuẩn.");
    
  } catch (error) {
    console.error("Lỗi khi reset database:", error);
  } finally {
    await pool.end();
  }
}

reset();
