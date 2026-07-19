import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter";
import "./index.css";
import App from "./App";

// Hỗ trợ Back-Forward Cache (BFCache)
// Đảm bảo trạng thái hệ thống được cập nhật khi người dùng sử dụng nút Back/Forward của trình duyệt
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log("BFCache: Trang được khôi phục từ bộ nhớ đệm (Back/Forward).");
    // Có thể thêm logic re-fetch data ở đây nếu cần thiết để đảm bảo dữ liệu mới nhất
    // window.location.reload(); // Bỏ comment nếu muốn ép tải lại trang
  }
});

// Lắng nghe sự kiện pagehide để dọn dẹp (nếu có các kết nối WebSocket/Worker)
window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    console.log("BFCache: Trang được lưu vào bộ nhớ đệm.");
  }
});

createRoot(document.getElementById("root")).render(
    <App />
);
